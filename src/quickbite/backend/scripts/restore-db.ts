/**
 * Khôi phục database từ file sao lưu (.sql.gz hoặc .sql):
 *   npm run db:restore -- "../database/quickbite_backup_2026-11-20_020000.sql.gz" --yes
 *
 * ⚠️ GHI ĐÈ toàn bộ dữ liệu của database đích. Các lớp bảo vệ:
 *   1. Bắt buộc --yes.
 *   2. Ghi đè database CHÍNH khi NODE_ENV=production hoặc database nằm trên cloud → phải gõ thêm --confirm=<tên database>.
 *   3. Kiểm tra mã SHA-256 với file .json đi kèm: file hỏng / bị sửa → dừng, không đụng tới database.
 *   4. Tự sao lưu database đích trước khi ghi đè (nhãn "truoc-khoi-phuc"), bỏ qua bằng --no-safety-backup.
 *   5. Sau khi khôi phục: so số dòng từng bảng và migration với lúc sao lưu.
 *
 * Tuỳ chọn --database=<tên> để khôi phục vào database khác (vd diễn tập khôi phục), không động tới database chính.
 */
import 'dotenv/config';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createGunzip } from 'node:zlib';
import { runBackup } from './backup-db.js';
import {
  type BackupManifest,
  compareRowCounts,
  countRows,
  isLocalHost,
  lastMigration,
  manifestPathOf,
  parseArgs,
  parseDatabaseUrl,
  runMysql,
  sha256File,
} from './db-tools.js';

const USAGE = 'Cách dùng: npm run db:restore -- "<file .sql.gz | .sql>" --yes [--database=<tên>] [--confirm=<tên>] [--no-safety-backup]';

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const file = positional[0] && path.resolve(positional[0]);
  if (!file || !existsSync(file)) {
    console.error(USAGE);
    process.exit(1);
  }
  const db = parseDatabaseUrl();
  const target = typeof flags.get('database') === 'string' ? (flags.get('database') as string) : db.database;
  if (!/^[A-Za-z0-9_]+$/.test(target)) throw new Error('Tên database không hợp lệ');

  if (!flags.has('yes')) {
    console.error(`⚠️ Lệnh này sẽ GHI ĐÈ toàn bộ dữ liệu của database "${target}" tại ${db.host}.`);
    console.error('   Nếu chắc chắn, chạy lại kèm --yes');
    process.exit(1);
  }
  const critical = target === db.database && (process.env.NODE_ENV === 'production' || !isLocalHost(db.host));
  if (critical && flags.get('confirm') !== target) {
    console.error(`⛔ "${target}" là database chính của môi trường production / cloud (${db.host}).`);
    console.error(`   Để ghi đè, thêm --confirm=${target}. Muốn thử trước, dùng --database=${target}_restore_test.`);
    process.exit(1);
  }

  // 1. Kiểm tra file sao lưu
  const manifestFile = manifestPathOf(file);
  let manifest: BackupManifest | null = null;
  if (existsSync(manifestFile)) {
    manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as BackupManifest;
    const actual = await sha256File(file);
    if (actual !== manifest.sha256) {
      throw new Error(`File sao lưu không khớp mã kiểm tra (SHA-256) — file bị hỏng hoặc đã bị sửa. Không khôi phục.\n   Mong đợi ${manifest.sha256}\n   Thực tế  ${actual}`);
    }
    console.log(`✅ File hợp lệ (SHA-256 khớp). Sao lưu lúc ${new Date(manifest.createdAt).toLocaleString('vi-VN')} từ "${manifest.database}", migration ${manifest.lastMigration ?? '(không có)'}`);
  } else {
    console.log(`⚠️ Không có file kiểm tra ${path.basename(manifestFile)} (bản sao lưu cũ) → bỏ qua bước kiểm tra mã và số dòng.`);
  }

  // 2. Sao lưu database đích trước khi ghi đè
  const targetDb = { ...db, database: target };
  const existing = await runMysql(db, ['-N', '-B', '-e', `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${target}'`]);
  if (Number(existing.trim()) > 0) {
    if (flags.has('no-safety-backup')) console.log('⚠️ Bỏ qua sao lưu an toàn (--no-safety-backup).');
    else {
      console.log(`🛟 Sao lưu an toàn "${target}" trước khi ghi đè:`);
      await runBackup({ db: targetDb, label: 'truoc-khoi-phuc', keep: 0 });
    }
  }

  // 3. Khôi phục: xoá & tạo lại database rỗng rồi nạp file
  const started = Date.now();
  console.log(`⏳ Đang khôi phục "${path.basename(file)}" vào database "${target}"...`);
  await runMysql(db, ['-e', `DROP DATABASE IF EXISTS \`${target}\`; CREATE DATABASE \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`]);
  const input = file.endsWith('.gz') ? createReadStream(file).pipe(createGunzip()) : createReadStream(file);
  await runMysql(db, [target], input);
  console.log(`✅ Đã nạp xong (${((Date.now() - started) / 1000).toFixed(1)} giây).`);

  // 4. Kiểm tra sau khôi phục
  const [rows, migration] = await Promise.all([countRows(db, target), lastMigration(db, target)]);
  const total = Object.values(rows).reduce((a, b) => a + b, 0);
  console.log(`   Database "${target}": ${Object.keys(rows).length} bảng, ${total.toLocaleString('vi-VN')} dòng, migration ${migration ?? '(không có)'}`);
  if (manifest) {
    const diffs = compareRowCounts(manifest.tables, rows);
    const sameMigration = manifest.lastMigration === migration;
    if (diffs.length === 0 && sameMigration) {
      console.log(`✅ Khớp hoàn toàn với lúc sao lưu: ${Object.keys(rows).length}/${Object.keys(manifest.tables).length} bảng đúng số dòng, cùng migration.`);
    } else {
      if (!sameMigration) console.log(`⚠️ Migration khác: lúc sao lưu ${manifest.lastMigration}, sau khôi phục ${migration}`);
      for (const d of diffs) console.log(`⚠️ Bảng ${d.table}: lúc sao lưu ${d.expected ?? '—'} dòng, sau khôi phục ${d.actual ?? '—'} dòng`);
      console.log('   (Lệch vài dòng ở bảng thay đổi liên tục là bình thường nếu lúc sao lưu hệ thống đang có người dùng.)');
    }
  }
  if (target === db.database) console.log('   Tiếp theo: "npm run db:deploy" (nếu code mới hơn bản sao lưu) và "npm run db:check".');
}

main().catch((err) => {
  console.error('❌ Khôi phục thất bại:', err instanceof Error ? err.message : err);
  process.exit(1);
});
