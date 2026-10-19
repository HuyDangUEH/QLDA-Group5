import type { RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/app-error.js';
import { currentUser } from './auth.js';

export type StallAccessRole = 'ADMIN' | 'OWNER' | 'STAFF';

/**
 * Kiểm tra người dùng có quyền thao tác trên quầy `stallId` không, trả về vai trò tại quầy.
 * - ADMIN: luôn được phép.
 * - VENDOR: phải có VendorMembership với quầy đó (OWNER hoặc STAFF).
 * - Vai trò khác: bị từ chối.
 * Trả 404 (thay vì 403) khi vendor truy cập quầy không thuộc mình, để không lộ quầy nào tồn tại.
 */
export async function assertStallAccess(user: Express.AuthUser, stallId: number): Promise<StallAccessRole> {
  if (user.role === 'ADMIN') {
    const exists = await prisma.foodStall.count({ where: { id: stallId } });
    if (!exists) throw AppError.notFound('Không tìm thấy quầy');
    return 'ADMIN';
  }
  if (user.role !== 'VENDOR') throw AppError.forbidden();

  const membership = await prisma.vendorMembership.findUnique({
    where: { userId_stallId: { userId: user.id, stallId } },
    select: { role: true },
  });
  if (!membership) throw AppError.notFound('Không tìm thấy quầy');
  return membership.role;
}

/** Danh sách ID quầy mà vendor được quản lý */
export async function getManagedStallIds(userId: number): Promise<number[]> {
  const rows = await prisma.vendorMembership.findMany({ where: { userId }, select: { stallId: true } });
  return rows.map((r) => r.stallId);
}

/**
 * Middleware cho route có :stallId — kiểm tra quyền MỘT lần cho mọi route con,
 * rồi lưu vào res.locals.stallId / res.locals.stallRole.
 */
export const requireStallAccess: RequestHandler = async (req, res, next) => {
  const { stallId } = z.object({ stallId: z.coerce.number().int().positive() }).parse(req.params);
  res.locals.stallRole = await assertStallAccess(currentUser(req), stallId);
  res.locals.stallId = stallId;
  next();
};

/** Chỉ chủ quầy (OWNER) hoặc admin. Dùng SAU requireStallAccess. */
export const requireStallOwner: RequestHandler = (_req, res, next) => {
  if (res.locals.stallRole === 'STAFF') return next(AppError.forbidden('Chỉ chủ quầy mới được thực hiện thao tác này'));
  next();
};
