/**
 * Nạp .env.test TRƯỚC khi bất kỳ module nào đọc biến môi trường,
 * và chặn chạy test trên database không phải database test.
 */
import { config } from 'dotenv';

config({ path: '.env.test', override: true, quiet: true });
process.env.NODE_ENV = 'test';

const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] ?? '';
if (!dbName.endsWith('_test')) {
  throw new Error(
    `⛔ Từ chối chạy test: database "${dbName}" không kết thúc bằng "_test". ` +
      'Hãy tạo file .env.test (xem .env.test.example) trỏ tới database test riêng.',
  );
}
