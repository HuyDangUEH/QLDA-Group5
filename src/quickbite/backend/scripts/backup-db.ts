/**
 * Sao lưu database MySQL:   npm run db:backup [-- --dir=<thư mục>] [--keep=14] [--label=truoc-trien-khai]
 *
 * - Đọc thông tin kết nối từ DATABASE_URL (máy local hoặc Aiven / cloud; tự bật SSL khi cần).
 * - Ghi file nén <db>_backup_<thời gian>[_<nhãn>].sql.gz vào ../database/ (hoặc BACKUP_DIR / --dir).
 * - Ghi kèm file kiểm tra .json: mã SHA-256, số dòng từng bảng, migration mới nhất → dùng để kiểm tra khi khôi phục.
 * - Ảnh chụp nhất quán (--single-transaction), không khoá bảng → chạy được khi hệ thống đang hoạt động.
 * - Chỉ giữ `--keep` bản định kỳ mới nhất (mặc định BACKUP_KEEP hoặc 14). Bản có nhãn không bị xoá tự động.
 * - File KHÔNG kèm CREATE DATABASE / USE nên khôi phục được vào database tên bất kỳ (xem scripts/restore-db.ts).
 * - Mật khẩu truyền qua biến môi trường MYSQL_PWD (không hiện trên dòng lệnh / danh sách tiến trình).
 *
 * ⚠️ File sao lưu chứa dữ liệu cá nhân (email, SĐT, hash mật khẩu): KHÔNG đưa lên GitHub, lưu ở nơi an toàn.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import {
  type BackupManifest,
  type DbConfig,
  DEFAULT_BACKUP_DIR,
  backupFileName,
  cleanStderr,
  connectionArgs,
  countRows,
  findMysqlTool,
  formatBytes,
  lastMigration,
  manifestPathOf,
  parseArgs,
  parseDatabaseUrl,
  selectExpiredBackups,
  sha256File,
} from './db-tools.js';

export interface BackupOptions {
  dir?: string;
  label?: string;
  /** Số bản định kỳ giữ lại; 0 = không xoá bản nào */
  keep?: number;
  db?: DbConfig;
}

export async function runBackup(opts: BackupOptions = {}) {
  const db = opts.db ?? parseDatabaseUrl();
  const dir = path.resolve(opts.dir ?? process.env.BACKUP_DIR ?? DEFAULT_BACKUP_DIR);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, backupFileName(db.database, new Date(), opts.label));
  const started = Date.now();

  console.log(`⏳ Đang sao lưu database "${db.database}" tại ${db.host}${db.ssl ? ' (SSL)' : ''}...`);
  const args = [
    ...connectionArgs(db),
    '--single-transaction', // ảnh chụp nhất quán, không khoá bảng khi đang chạy
    '--quick', // đọc từng dòng, không dồn cả bảng vào RAM
    '--routines',
    '--triggers',
    '--no-tablespaces',
    '--set-gtid-purged=OFF',
    '--skip-comments',
    db.database,
  ];
  const child = spawn(findMysqlTool('mysqldump'), args, { env: { ...process.env, MYSQL_PWD: db.password } });
  let stderr = '';
  child.stderr.on('data', (c) => (stderr += c));
  const exited = new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
  await pipeline(child.stdout, createGzip({ level: 6 }), createWriteStream(file));
  const code = await exited;
  if (code !== 0) {
    rmSync(file, { force: true });
    throw new Error(`mysqldump lỗi (mã ${code}):\n${cleanStderr(stderr)}`);
  }

  // Số dòng đếm ngay sau khi dump: nếu hệ thống đang có người dùng, có thể lệch vài dòng ở bảng thay đổi liên tục
  const [tables, migration, sha256] = await Promise.all([countRows(db), lastMigration(db), sha256File(file)]);
  const manifest: BackupManifest = {
    app: 'quickbite',
    database: db.database,
    host: db.host,
    createdAt: new Date(started).toISOString(),
    file: path.basename(file),
    bytes: statSync(file).size,
    sha256,
    compressed: true,
    lastMigration: migration,
    tables,
    durationMs: Date.now() - started,
  };
  writeFileSync(manifestPathOf(file), JSON.stringify(manifest, null, 2));

  // Xoá bản định kỳ cũ
  const keep = opts.keep ?? Number(process.env.BACKUP_KEEP ?? 14);
  const expired = selectExpiredBackups(readdirSync(dir), db.database, keep);
  for (const f of expired) {
    rmSync(path.join(dir, f), { force: true });
    rmSync(manifestPathOf(path.join(dir, f)), { force: true });
  }

  const totalRows = Object.values(tables).reduce((a, b) => a + b, 0);
  console.log(`✅ Đã sao lưu: ${file}`);
  console.log(`   ${formatBytes(manifest.bytes)} (nén gzip) · ${Object.keys(tables).length} bảng · ${totalRows.toLocaleString('vi-VN')} dòng · ${(manifest.durationMs / 1000).toFixed(1)} giây`);
  console.log(`   Migration: ${migration ?? '(không có)'} · SHA-256: ${sha256.slice(0, 16)}…`);
  if (expired.length) console.log(`   Đã xoá ${expired.length} bản cũ (giữ ${keep} bản định kỳ mới nhất)`);
  return { file, manifest, expired };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const keep = flags.has('keep') ? Number(flags.get('keep')) : undefined;
  if (keep !== undefined && (!Number.isInteger(keep) || keep < 0)) throw new Error('--keep phải là số nguyên ≥ 0');
  const { file } = await runBackup({
    dir: typeof flags.get('dir') === 'string' ? (flags.get('dir') as string) : undefined,
    label: typeof flags.get('label') === 'string' ? (flags.get('label') as string) : undefined,
    keep,
  });
  console.log(`   Khôi phục: npm run db:restore -- "${file}" --yes`);
  console.log('   ⚠️ File chứa dữ liệu cá nhân (email, SĐT, hash mật khẩu) — không đưa lên GitHub.');
}

// Chỉ chạy khi gọi trực tiếp (restore-db.ts dùng lại runBackup)
if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  main().catch((err) => {
    console.error('❌ Sao lưu thất bại:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
