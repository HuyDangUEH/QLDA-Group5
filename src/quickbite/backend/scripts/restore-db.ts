/**
 * Khôi phục database từ file sao lưu .sql:
 *   npm run db:restore -- "../database/quickbite_backup_2026-10-16_1530.sql" --yes
 *
 * ⚠️ GHI ĐÈ toàn bộ dữ liệu của database trong DATABASE_URL. Bắt buộc thêm --yes để xác nhận.
 * Tuỳ chọn --database=<tên> để khôi phục vào database khác (vd để thử), không động tới database chính.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { findMysqlTool, parseDatabaseUrl } from './backup-db.js';

function runMysql(args: string[], password: string, inputFile?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(findMysqlTool('mysql'), args, { env: { ...process.env, MYSQL_PWD: password } });
    let stderr = '';
    child.stderr.on('data', (c) => (stderr += c));
    if (inputFile) createReadStream(inputFile).pipe(child.stdin);
    else child.stdin.end();
    child.on('close', (code) => {
      const errors = stderr.split(/\r?\n/).filter((l) => l.trim() && !/Using a password/i.test(l));
      if (code === 0) resolve();
      else reject(new Error(errors.join('\n') || `mysql thoát với mã ${code}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const confirmed = args.includes('--yes');
  const target = args.find((a) => a.startsWith('--database='))?.split('=')[1];

  if (!file || !existsSync(file)) {
    console.error('Cách dùng: npm run db:restore -- "<file .sql>" --yes [--database=<tên>]');
    process.exit(1);
  }
  const db = parseDatabaseUrl();
  const database = target ?? db.database;
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('Tên database không hợp lệ');

  if (!confirmed) {
    console.error(`⚠️ Lệnh này sẽ GHI ĐÈ toàn bộ dữ liệu của database "${database}".`);
    console.error('   Nếu chắc chắn, chạy lại kèm --yes');
    process.exit(1);
  }

  const conn = [`--host=${db.host}`, `--port=${db.port}`, `--user=${db.user}`, '--default-character-set=utf8mb4'];
  console.log(`⏳ Đang khôi phục "${path.basename(file)}" vào database "${database}"...`);
  // Xoá & tạo lại database rỗng để khôi phục sạch
  await runMysql([...conn, '-e', `DROP DATABASE IF EXISTS \`${database}\`; CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`], db.password);
  await runMysql([...conn, database], db.password, path.resolve(file));
  console.log(`✅ Đã khôi phục xong database "${database}". Chạy "npm run db:check" để kiểm tra.`);
}

main().catch((err) => {
  console.error('❌ Khôi phục thất bại:', err instanceof Error ? err.message : err);
  process.exit(1);
});
