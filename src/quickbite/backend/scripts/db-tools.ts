/**
 * Hàm dùng chung cho sao lưu / khôi phục database (scripts/backup-db.ts, scripts/restore-db.ts).
 * Các hàm thuần (không gọi MySQL) được test trong tests/db-tools.test.ts.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export interface DbConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  /** Bắt buộc kết nối mã hoá (SSL), vd Aiven / database trên cloud */
  ssl: boolean;
}

/** Thư mục sao lưu mặc định: quickbite/database (đã nằm trong .gitignore) */
export const DEFAULT_BACKUP_DIR = path.resolve(import.meta.dirname, '../../database');

const LOCAL_HOSTS =new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'mysql', 'host.docker.internal']);
export const isLocalHost = (host: string) => LOCAL_HOSTS.has(host.toLowerCase());

/**
 * Đọc DATABASE_URL (định dạng Prisma: mysql://user:pass@host:port/db?sslaccept=...).
 * SSL bật khi URL có tham số ssl (sslaccept, sslcert, ssl-mode, sslmode, ssl) hoặc host không phải máy local.
 * Có thể ép bằng biến DB_SSL=true / false.
 */
export function parseDatabaseUrl(raw = process.env.DATABASE_URL, sslEnv = process.env.DB_SSL): DbConfig {
  if (!raw) throw new Error('Thiếu DATABASE_URL trong backend/.env');
  const url = new URL(raw);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL phải bắt đầu bằng mysql://');
  const database = url.pathname.replace(/^\//, '');
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('Tên database trong DATABASE_URL không hợp lệ');
  const sslParam = ['sslaccept', 'sslcert', 'ssl-mode', 'sslmode', 'ssl'].some((k) => url.searchParams.has(k));
  const ssl = sslEnv === 'true' ? true : sslEnv === 'false' ? false : sslParam || !isLocalHost(url.hostname);
  return {
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl,
  };
}

/** Tham số kết nối cho mysql / mysqldump. Mật khẩu KHÔNG nằm ở đây (truyền qua biến MYSQL_PWD). */
export function connectionArgs(db: DbConfig): string[] {
  return [
    `--host=${db.host}`,
    `--port=${db.port}`,
    `--user=${db.user}`,
    '--default-character-set=utf8mb4',
    ...(db.ssl ? ['--ssl-mode=REQUIRED'] : []),
  ];
}

/** Tìm mysqldump.exe / mysql.exe: MYSQL_BIN_DIR → PATH → C:\Program Files\MySQL\MySQL Server *\bin */
export function findMysqlTool(tool: 'mysqldump' | 'mysql'): string {
  const exe = process.platform === 'win32' ? `${tool}.exe` : tool;
  const candidates: string[] = [];
  if (process.env.MYSQL_BIN_DIR) candidates.push(path.join(process.env.MYSQL_BIN_DIR, exe));
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) candidates.push(path.join(dir, exe));
  if (process.platform === 'win32') {
    const root = 'C:\\Program Files\\MySQL';
    if (existsSync(root)) {
      for (const d of readdirSync(root).filter((n) => n.startsWith('MySQL Server')).sort().reverse()) {
        candidates.push(path.join(root, d, 'bin', exe));
      }
    }
  }
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`Không tìm thấy ${exe}. Thêm thư mục bin của MySQL vào PATH hoặc đặt MYSQL_BIN_DIR.`);
  return found;
}

/** Bỏ cảnh báo vô hại khi dùng mật khẩu qua biến môi trường */
export const cleanStderr = (stderr: string) =>
  stderr
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/Using a password/i.test(l))
    .join('\n');

/** Chạy lệnh mysql, trả về stdout. `input` là luồng dữ liệu đưa vào stdin (vd file .sql). */
export function runMysql(db: DbConfig, args: string[], input?: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(findMysqlTool('mysql'), [...connectionArgs(db), ...args], { env: { ...process.env, MYSQL_PWD: db.password } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('error', reject);
    if (input) {
      input.on('error', (err) => {
        child.kill();
        reject(err);
      });
      input.pipe(child.stdin);
    } else child.stdin.end();
    child.on('close', (code) => (code === 0 ? resolve(stdout) : reject(new Error(cleanStderr(stderr) || `mysql thoát với mã ${code}`))));
  });
}

/** Số dòng của từng bảng (đếm chính xác bằng COUNT(*)) */
export async function countRows(db: DbConfig, database = db.database): Promise<Record<string, number>> {
  const tables = (await runMysql(db, ['-N', '-B', '-e', `SELECT table_name FROM information_schema.tables WHERE table_schema = '${database}' AND table_type = 'BASE TABLE' ORDER BY table_name`]))
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tables.length === 0) return {};
  const sql = tables.map((t) => `SELECT '${t}', COUNT(*) FROM \`${database}\`.\`${t}\``).join(' UNION ALL ');
  const out = await runMysql(db, ['-N', '-B', '-e', sql]);
  return Object.fromEntries(
    out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [name, n] = line.split('\t');
        return [name!, Number(n)];
      }),
  );
}

/** Migration Prisma mới nhất đã áp dụng (để biết bản sao lưu ứng với phiên bản schema nào) */
export async function lastMigration(db: DbConfig, database = db.database): Promise<string | null> {
  try {
    const out = await runMysql(db, ['-N', '-B', '-e', `SELECT migration_name FROM \`${database}\`.\`_prisma_migrations\` WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1`]);
    return out.trim() || null;
  } catch {
    return null;
  }
}

export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('data', (c) => hash.update(c))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** YYYY-MM-DD_HHmmss theo giờ máy chạy */
export function timestamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Tên file sao lưu: <db>_backup_<thời gian>[_<nhãn>].sql.gz */
export function backupFileName(database: string, when = new Date(), label?: string) {
  // Bỏ dấu tiếng Việt rồi chỉ giữ a-z 0-9 -
  const safeLabel = label?.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${database}_backup_${timestamp(when)}${safeLabel ? `_${safeLabel}` : ''}.sql.gz`;
}

/** File kiểm tra đi kèm: cùng tên, đuôi .json */
export const manifestPathOf = (backupFile: string) => backupFile.replace(/\.sql(\.gz)?$/, '.json');

/**
 * Chọn các bản sao lưu ĐỊNH KỲ cũ cần xoá, chỉ giữ `keep` bản mới nhất.
 * Bản có nhãn (vd "truoc-khoi-phuc", "truoc-trien-khai") không bao giờ bị xoá tự động.
 */
export function selectExpiredBackups(files: string[], database: string, keep: number): string[] {
  if (keep <= 0) return [];
  const re = new RegExp(`^${database}_backup_(\\d{4}-\\d{2}-\\d{2}_\\d{4,6})\\.sql(\\.gz)?$`);
  return files
    .filter((f) => re.test(f))
    .sort((a, b) => b.localeCompare(a)) // tên chứa thời gian → sắp xếp chữ = sắp xếp thời gian
    .slice(keep);
}

export interface BackupManifest {
  app: 'quickbite';
  database: string;
  host: string;
  createdAt: string;
  file: string;
  bytes: number;
  sha256: string;
  compressed: boolean;
  lastMigration: string | null;
  tables: Record<string, number>;
  durationMs: number;
}

export interface RowDiff {
  table: string;
  expected: number | null;
  actual: number | null;
}

/** So sánh số dòng sau khi khôi phục với số dòng lúc sao lưu */
export function compareRowCounts(expected: Record<string, number>, actual: Record<string, number>): RowDiff[] {
  const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  return names
    .map((table) => ({ table, expected: expected[table] ?? null, actual: actual[table] ?? null }))
    .filter((d) => d.expected !== d.actual);
}

/** Đọc tham số dạng --ten=gia-tri / --co */
export function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) flags.set(m[1]!, m[2] ?? true);
    else positional.push(a);
  }
  return { flags, positional };
}

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);
