import type { CookieOptions, Response } from 'express';
import { isProduction } from '../config/env.js';
import { SESSION_MAX_AGE_MS } from '../lib/jwt.js';

export const SESSION_COOKIE = 'qb_session';

/**
 * Cookie phiên đăng nhập:
 * - httpOnly: JavaScript phía trình duyệt không đọc được (chống đánh cắp token qua XSS)
 * - sameSite=lax: trình duyệt không gửi cookie trong request POST/PATCH/DELETE từ trang web khác (chống CSRF)
 * - secure: chỉ gửi qua HTTPS khi chạy production
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions, maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, baseOptions);
}
