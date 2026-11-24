/**
 * Kiểm tra cấu hình production trước / sau khi triển khai:
 *   npm run prod:check                         (đọc backend/.env)
 *   npm run prod:check -- --env-file=.env.production
 *
 * Kiểm tra 2 phần:
 *   1. Biến môi trường: NODE_ENV, JWT_SECRET, DATABASE_URL (SSL, không dùng root), CORS https, TRUST_PROXY, API_DOCS...
 *   2. Database: kết nối, migration chưa áp dụng, tài khoản demo còn sót, có quản trị viên, bản sao lưu gần nhất.
 * Thoát với mã 1 nếu có lỗi (❌) → dùng được trong quy trình triển khai tự động.
 * Không in mật khẩu / khoá bí mật.
 */
import { config as loadEnv } from 'dotenv';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
// Không import file có 'dotenv/config' (vd backup-db.ts): .env sẽ bị nạp trước --env-file
import { DEFAULT_BACKUP_DIR, parseArgs, parseDatabaseUrl } from './db-tools.js';
import { type CheckResult, checkProductionEnv, hoursSinceLatestBackup, pendingMigrations } from './production-config.js';

const ICON = { ok: '✅', warn: '⚠️ ', error: '❌' } as const;
const print = (r: CheckResult) => console.log(`  ${ICON[r.level]} ${r.key.padEnd(22)} ${r.message}`);

async function checkDatabase(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const add = (key: string, level: CheckResult['level'], message: string) => out.push({ key, level, message });
  // Nạp Prisma sau khi đã đọc file cấu hình
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    const [v] = await prisma.$queryRaw<{ version: string }[]>`SELECT VERSION() AS version`;
    add('Kết nối', 'ok', `MySQL ${v?.version}`);

    const dir = path.resolve(import.meta.dirname, '../prisma/migrations');
    const inCode = readdirSync(dir).filter((d) => statSync(path.join(dir, d)).isDirectory());
    const applied = (await prisma.$queryRaw<{ name: string }[]>`SELECT migration_name AS name FROM _prisma_migrations WHERE finished_at IS NOT NULL`).map((r) => r.name);
    const pending = pendingMigrations(inCode, applied);
    if (pending.length) add('Migration', 'error', `${pending.length} migration chưa áp dụng (${pending.join(', ')}) — chạy "npm run db:deploy"`);
    else add('Migration', 'ok', `đã áp dụng đủ ${inCode.length} migration`);

    const demo = await prisma.user.count({ where: { email: { endsWith: '@quickbite.test' } } });
    if (demo > 0) add('Tài khoản demo', process.env.NODE_ENV === 'production' ? 'error' : 'warn', `còn ${demo} tài khoản @quickbite.test (mật khẩu mẫu công khai) — xoá trước khi chạy thật`);
    else add('Tài khoản demo', 'ok', 'không có');

    const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (admins === 0) add('Quản trị viên', 'error', 'không có tài khoản ADMIN đang hoạt động');
    else add('Quản trị viên', 'ok', `${admins} tài khoản ADMIN đang hoạt động`);
  } catch (err) {
    add('Kết nối', 'error', `không kết nối được database: ${(err instanceof Error ? err.message : String(err)).split('\n').at(-1)}`);
  } finally {
    await prisma.$disconnect();
  }

  // Bản sao lưu gần nhất
  const backupDir = path.resolve(process.env.BACKUP_DIR ?? DEFAULT_BACKUP_DIR);
  const database = parseDatabaseUrl().database;
  const files = existsSync(backupDir) ? readdirSync(backupDir).map((name) => ({ name, mtimeMs: statSync(path.join(backupDir, name)).mtimeMs })) : [];
  const hours = hoursSinceLatestBackup(files, database);
  if (hours === null) add('Sao lưu', 'warn', `chưa có bản sao lưu nào trong ${backupDir} — chạy "npm run db:backup"`);
  else if (hours > 26) add('Sao lưu', 'warn', `bản mới nhất cách đây ${Math.round(hours)} giờ — nên sao lưu hằng ngày`);
  else add('Sao lưu', 'ok', `bản mới nhất cách đây ${hours < 1 ? `${Math.round(hours * 60)} phút` : `${hours.toFixed(1)} giờ`}`);
  return out;
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const envFile = typeof flags.get('env-file') === 'string' ? path.resolve(flags.get('env-file') as string) : path.resolve('.env');
  if (!existsSync(envFile)) throw new Error(`Không tìm thấy file ${envFile}`);
  loadEnv({ path: envFile, quiet: true });

  console.log(`🔎 Kiểm tra cấu hình production — ${path.basename(envFile)}\n`);
  console.log('1. Biến môi trường');
  const envResults = checkProductionEnv(process.env);
  envResults.forEach(print);
  console.log('\n2. Database');
  const dbResults = process.env.DATABASE_URL ? await checkDatabase() : [{ key: 'Kết nối', level: 'error' as const, message: 'bỏ qua — thiếu DATABASE_URL' }];
  dbResults.forEach(print);

  const all = [...envResults, ...dbResults];
  const errors = all.filter((r) => r.level === 'error').length;
  const warns = all.filter((r) => r.level === 'warn').length;
  console.log(`\nKết quả: ${all.length - errors - warns} đạt · ${warns} cảnh báo · ${errors} lỗi`);
  if (errors) {
    console.log('❌ CHƯA sẵn sàng cho production — sửa các mục ❌ ở trên.');
    process.exitCode = 1;
  } else console.log(warns ? '✅ Sẵn sàng (nên xem lại các cảnh báo ⚠️).' : '✅ Sẵn sàng cho production.');
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
