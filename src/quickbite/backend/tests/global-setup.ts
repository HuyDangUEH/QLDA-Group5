/**
 * Chạy MỘT lần trước toàn bộ test: áp dụng migration lên database test.
 * `prisma migrate deploy` tự tạo database quickbite_test nếu chưa có.
 */
import { execSync } from 'node:child_process';
import { config } from 'dotenv';

export default function setup() {
  const { parsed } = config({ path: '.env.test', override: true, quiet: true });
  const url = parsed?.DATABASE_URL ?? '';
  const dbName = url.split('/').pop()?.split('?')[0] ?? '';
  if (!dbName.endsWith('_test')) {
    throw new Error(`⛔ Database test "${dbName}" phải kết thúc bằng "_test". Kiểm tra file .env.test`);
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
