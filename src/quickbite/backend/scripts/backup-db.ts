/**
 * Sao lưu database MySQL ra file .sql:   npm run db:backup
 *
 * - Đọc thông tin kết nối từ DATABASE_URL trong backend/.env
 * - Lưu vào thư mục ../database/ với tên quickbite_backup_YYYY-MM-DD_HHmm.sql
 * - Mật khẩu truyền qua biến môi trường MYSQL_PWD (không hiện trên dòng lệnh)
 * - File sao lưu KHÔNG kèm lệnh CREATE DATABASE / USE, nên có thể khôi phục vào database tên bất kỳ
 *   (xem scripts/restore-db.ts)
 *
 * Cần có mysqldump: tự tìm trong PATH hoặc C:\Program Files\MySQL\MySQL Server *\bin.
 * Có thể chỉ định đường dẫn bằng biến MYSQL_BIN_DIR.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export function parseDatabaseUrl(raw = process.env.DATABASE_URL) {
  if (!raw) throw new Error('Thiếu DATABASE_URL trong backend/.env');
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
}

/** Tìm mysqldump.exe / mysql.exe */
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

function timestamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

async function main() {
  const db = parseDatabaseUrl();
  const outDir = path.resolve(import.meta.dirname, '../../database');
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${db.database}_backup_${timestamp()}.sql`);

  const args = [
    `--host=${db.host}`,
    `--port=${db.port}`,
    `--user=${db.user}`,
    '--default-character-set=utf8mb4',
    '--single-transaction', // ảnh chụp nhất quán, không khoá bảng khi đang chạy
    '--routines',
    '--triggers',
    '--no-tablespaces',
    '--set-gtid-purged=OFF',
    '--skip-comments',
    db.database,
  ];

  console.log(`⏳ Đang sao lưu database "${db.database}"...`);
  const out = createWriteStream(outFile);
  const child = spawn(findMysqlTool('mysqldump'), args, { env: { ...process.env, MYSQL_PWD: db.password } });
  child.stdout.pipe(out);
  let stderr = '';
  child.stderr.on('data', (c) => (stderr += c));

  const code: number = await new Promise((resolve) => child.on('close', resolve));
  await new Promise((r) => out.end(r));
  // Bỏ cảnh báo vô hại về việc dùng mật khẩu qua biến môi trường
  const errors = stderr.split(/\r?\n/).filter((l) => l.trim() && !/Using a password/i.test(l));
  if (code !== 0) {
    console.error('❌ Sao lưu thất bại:\n' + errors.join('\n'));
    process.exit(1);
  }

  const kb = (statSync(outFile).size / 1024).toFixed(1);
  console.log(`✅ Đã sao lưu: ${outFile} (${kb} KB)`);
  console.log('   Khôi phục: npm run db:restore -- "<đường dẫn file>" --yes');
  console.log('   ⚠️ File chứa dữ liệu cá nhân (email, SĐT, hash mật khẩu) — không đưa lên GitHub.');
}

// Chỉ chạy khi gọi trực tiếp (cho phép restore-db.ts dùng lại các hàm ở trên)
if (import.meta.filename === path.resolve(process.argv[1] ?? '')) void main();
