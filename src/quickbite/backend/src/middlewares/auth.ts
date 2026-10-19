import type { Request, RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { verifySessionToken } from '../lib/jwt.js';
import { AppError } from '../utils/app-error.js';
import { clearSessionCookie, SESSION_COOKIE } from '../utils/session-cookie.js';

/**
 * Đọc cookie phiên, kiểm tra JWT, rồi tải người dùng từ DB.
 * Luôn kiểm tra lại trạng thái tài khoản & tokenVersion trong DB, nên khi admin khoá tài khoản
 * hoặc người dùng đổi mật khẩu thì các phiên cũ mất hiệu lực ngay lập tức.
 */
async function resolveUser(req: Request): Promise<Express.AuthUser | null> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, fullName: true, role: true, status: true, tokenVersion: true },
  });
  if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== payload.tv) return null;

  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}

/** Bắt buộc đăng nhập */
export const authenticate: RequestHandler = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    if (req.cookies?.[SESSION_COOKIE]) clearSessionCookie(res);
    return next(AppError.unauthorized('Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'));
  }
  req.user = user;
  next();
};

/** Không bắt buộc đăng nhập, nhưng gắn req.user nếu có phiên hợp lệ */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  req.user = (await resolveUser(req)) ?? undefined;
  next();
};

/** Chỉ cho phép các vai trò được liệt kê. Dùng SAU authenticate. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}

/** Lấy người dùng hiện tại trong controller (sau authenticate) */
export function currentUser(req: Request): Express.AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
