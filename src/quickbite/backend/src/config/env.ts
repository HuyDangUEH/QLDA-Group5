import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'Thiếu DATABASE_URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN phải có dạng số + đơn vị s/m/h/d, vd: 7d, 12h')
    .default('7d'),
  /**
   * Số reverse proxy (nginx, load balancer...) đứng trước API. 0 = không tin header X-Forwarded-For.
   * Đặt sai (lớn hơn thực tế) cho phép kẻ xấu giả IP để vượt giới hạn đăng nhập.
   */
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  /** Tên miền được phép làm ảnh món / quầy ngoài ảnh tự tải lên (/uploads/...) */
  IMAGE_HOSTS: z
    .string()
    .default('images.unsplash.com')
    .transform((v) =>
      v
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    ),
  /** Bật trang tài liệu API (/api/docs). Mặc định: bật khi phát triển, tắt khi production */
  API_DOCS: z.enum(['true', 'false']).optional(),
  /** Số lần thử đăng nhập/đăng ký tối đa mỗi 15 phút cho một IP */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(2),
});

const parsed = envSchema
  .superRefine((e, ctx) => {
    if (e.NODE_ENV !== 'production') return;
    // Production: không cho chạy với khoá mẫu hoặc khoá yếu
    if (/change_me|test_secret|your_|example/i.test(e.JWT_SECRET) || new Set(e.JWT_SECRET).size < 10) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET đang là giá trị mẫu hoặc quá yếu — hãy tạo chuỗi ngẫu nhiên mới cho production' });
    }
    if (e.CORS_ORIGINS.some((o) => o.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(o))) {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Production nên dùng origin https:// (cookie Secure không gửi qua http)' });
    }
  })
  .safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Cấu hình môi trường (.env) không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const apiDocsEnabled = env.API_DOCS ? env.API_DOCS === 'true' : !isProduction;
