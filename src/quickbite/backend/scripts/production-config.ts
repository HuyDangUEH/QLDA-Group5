/**
 * Các quy tắc kiểm tra cấu hình production (hàm thuần, không đọc file / không gọi database).
 * Dùng bởi scripts/check-production.ts; test trong tests/production-config.test.ts.
 */
import { isLocalHost } from './db-tools.js';

export type CheckLevel = 'ok' | 'warn' | 'error';
export interface CheckResult {
  key: string;
  level: CheckLevel;
  message: string;
}

const SAMPLE_SECRET = /change_me|test_secret|your_|example|secret123|password/i;
const isLocalOrigin = (o: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o);

export function checkProductionEnv(env: Record<string, string | undefined>): CheckResult[] {
  const out: CheckResult[] = [];
  const add = (key: string, level: CheckLevel, message: string) => out.push({ key, level, message });
  const onVercel = Boolean(env.VERCEL);

  // NODE_ENV
  if (env.NODE_ENV === 'production') add('NODE_ENV', 'ok', 'production (cookie Secure, tắt seed, ẩn chi tiết lỗi)');
  else add('NODE_ENV', 'error', `đang là "${env.NODE_ENV ?? '(trống)'}" — phải là production`);

  // JWT_SECRET
  const secret = env.JWT_SECRET ?? '';
  if (!secret) add('JWT_SECRET', 'error', 'chưa đặt');
  else if (SAMPLE_SECRET.test(secret) || new Set(secret).size < 10) add('JWT_SECRET', 'error', 'đang là giá trị mẫu hoặc quá yếu — tạo chuỗi ngẫu nhiên mới');
  else if (secret.length < 64) add('JWT_SECRET', 'warn', `dài ${secret.length} ký tự — nên ≥ 64 ký tự ngẫu nhiên`);
  else add('JWT_SECRET', 'ok', `${secret.length} ký tự ngẫu nhiên`);

  // DATABASE_URL
  const rawDb = env.DATABASE_URL;
  if (!rawDb) add('DATABASE_URL', 'error', 'chưa đặt');
  else {
    try {
      const url = new URL(rawDb);
      const host = url.hostname;
      const user = decodeURIComponent(url.username);
      const hasSsl = ['sslaccept', 'sslcert', 'ssl-mode', 'sslmode', 'ssl'].some((k) => url.searchParams.has(k));
      if (url.protocol !== 'mysql:') add('DATABASE_URL', 'error', 'phải bắt đầu bằng mysql://');
      else if (!url.password) add('DATABASE_URL', 'error', 'thiếu mật khẩu database');
      else if (user === 'root') add('DATABASE_URL', 'warn', 'đang dùng tài khoản root — nên tạo user riêng chỉ có quyền trên database của app');
      else if (!isLocalHost(host) && !hasSsl) add('DATABASE_URL', 'warn', `database ở xa (${host}) nhưng URL không có tham số SSL — thêm tham số SSL, vd ?sslaccept=accept_invalid_certs (Aiven bắt buộc SSL)`);
      else add('DATABASE_URL', 'ok', `${user}@${host}/${url.pathname.slice(1)}${hasSsl ? ' (SSL)' : ''}`);
    } catch {
      add('DATABASE_URL', 'error', 'không đúng định dạng URL (mật khẩu có ký tự đặc biệt phải mã hoá, vd @ → %40)');
    }
  }

  // CORS_ORIGINS
  const origins = (env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0) add('CORS_ORIGINS', 'error', 'chưa đặt địa chỉ frontend (vd https://quickbite.vercel.app)');
  else if (origins.some((o) => o.startsWith('http://') && !isLocalOrigin(o))) add('CORS_ORIGINS', 'error', 'có địa chỉ http:// — production phải dùng https:// (cookie Secure)');
  else if (origins.some(isLocalOrigin)) add('CORS_ORIGINS', 'warn', 'còn địa chỉ localhost — xoá khỏi cấu hình production');
  else add('CORS_ORIGINS', 'ok', origins.join(', '));

  // TRUST_PROXY
  const proxies = Number(env.TRUST_PROXY ?? 0);
  if (onVercel && proxies === 0) add('TRUST_PROXY', 'warn', 'chạy trên Vercel nhưng TRUST_PROXY=0 — giới hạn đăng nhập sẽ tính chung một IP; đặt 1');
  else if (proxies > 2) add('TRUST_PROXY', 'warn', `= ${proxies} — lớn hơn số proxy thực tế sẽ cho phép giả IP để vượt giới hạn đăng nhập`);
  else add('TRUST_PROXY', 'ok', proxies === 0 ? '0 (chạy trực tiếp, không có proxy)' : `${proxies} proxy phía trước`);

  // API_DOCS
  if (env.API_DOCS === 'true') add('API_DOCS', 'warn', 'đang bật trang tài liệu /api/docs ở production — chỉ bật khi cần demo');
  else add('API_DOCS', 'ok', env.API_DOCS === 'false' ? 'tắt (/api/docs trả 404)' : 'không đặt → tự tắt khi NODE_ENV=production (/api/docs trả 404)');

  // LOG_LEVEL
  if (['debug', 'trace'].includes(env.LOG_LEVEL ?? '')) add('LOG_LEVEL', 'warn', `"${env.LOG_LEVEL}" ghi quá nhiều — dùng info`);
  else add('LOG_LEVEL', 'ok', env.LOG_LEVEL ?? 'info');

  // UPLOAD_DIR
  const uploadDir = env.UPLOAD_DIR ?? 'uploads';
  if (onVercel) add('UPLOAD_DIR', 'warn', 'Vercel không giữ file tải lên giữa các lần chạy — ảnh tải lên có thể mất; nên dùng dịch vụ lưu trữ ảnh');
  else if (!/^([A-Za-z]:[\\/]|\/)/.test(uploadDir)) add('UPLOAD_DIR', 'warn', `"${uploadDir}" là đường dẫn tương đối — dùng đường dẫn tuyệt đối ngoài thư mục code và sao lưu thư mục này`);
  else add('UPLOAD_DIR', 'ok', uploadDir);

  // SEPAY_WEBHOOK_API_KEY
  const sepay = env.SEPAY_WEBHOOK_API_KEY?.trim();
  if (!sepay) add('SEPAY_WEBHOOK_API_KEY', 'ok', 'tắt — chủ quầy tự bấm "Đã nhận tiền"');
  else if (sepay.length < 16) add('SEPAY_WEBHOOK_API_KEY', 'error', 'phải dài ít nhất 16 ký tự');
  else add('SEPAY_WEBHOOK_API_KEY', 'ok', 'bật webhook tự xác nhận chuyển khoản');

  // BACKUP_DIR
  if (!env.BACKUP_DIR) add('BACKUP_DIR', 'warn', 'chưa đặt — bản sao lưu nằm trong thư mục code (../database); nên lưu ở ổ / máy khác');
  else add('BACKUP_DIR', 'ok', `${env.BACKUP_DIR} (giữ ${env.BACKUP_KEEP ?? 14} bản)`);

  return out;
}

/** Số giờ kể từ bản sao lưu mới nhất; null = chưa có */
export function hoursSinceLatestBackup(files: { name: string; mtimeMs: number }[], database: string, now = Date.now()): number | null {
  const re = new RegExp(`^${database}_backup_.*\\.sql(\\.gz)?$`);
  const latest = Math.max(...files.filter((f) => re.test(f.name)).map((f) => f.mtimeMs), -Infinity);
  return Number.isFinite(latest) ? (now - latest) / 3_600_000 : null;
}

/** Migration có trong code nhưng chưa áp dụng vào database */
export const pendingMigrations = (inCode: string[], applied: string[]) => inCode.filter((m) => !applied.includes(m)).sort();
