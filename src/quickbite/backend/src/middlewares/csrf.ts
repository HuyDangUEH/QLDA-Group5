import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Lớp chống CSRF thứ hai (bên cạnh cookie SameSite=Lax):
 * với request thay đổi dữ liệu, nếu trình duyệt gửi header Origin thì Origin đó phải nằm trong
 * danh sách CORS_ORIGINS. Trình duyệt hiện đại luôn gửi Origin với POST/PATCH/DELETE,
 * nên trang web lạ không thể giả mạo thao tác của người dùng đã đăng nhập.
 * Client không phải trình duyệt (Postman, test, mobile) không gửi Origin nên không bị ảnh hưởng.
 */
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !env.CORS_ORIGINS.includes(origin) && !isSameOrigin(origin, req.get('host'))) {
    return next(AppError.forbidden('Yêu cầu bị chặn: nguồn gửi không hợp lệ'));
  }
  next();
};

/**
 * Request từ chính trang của API (vd: Swagger UI tại /api/docs) không phải cross-site.
 * Trang lạ không thể làm trình duyệt gửi Origin trùng với Host của API.
 */
function isSameOrigin(origin: string, host: string | undefined): boolean {
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
