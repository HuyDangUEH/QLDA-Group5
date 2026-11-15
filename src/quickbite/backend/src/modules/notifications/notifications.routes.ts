import { Router } from 'express';
import { z } from 'zod';
import { authenticate, currentUser } from '../../middlewares/auth.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import { buildPaginationMeta, sendSuccess } from '../../utils/response.js';
import { idParamSchema, paginationSchema, toSkipTake } from '../../utils/validation.js';

/** Thông báo của người dùng đang đăng nhập (mọi vai trò). Mỗi người chỉ thấy thông báo của mình. */
export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

/** Lọc theo quầy (trang thông báo của chủ quầy): chỉ thông báo gắn với đơn của quầy đó */
const stallFilter = z.object({ stallId: z.coerce.number().int().positive('Mã quầy không hợp lệ').optional() });
const listQuery = paginationSchema.extend({ unread: z.enum(['true', 'false']).optional() }).merge(stallFilter);

const scopeOf = (userId: number, stallId?: number) => ({ userId, ...(stallId !== undefined && { order: { stallId } }) });

notificationsRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  const where = { ...scopeOf(currentUser(req).id, query.stallId), ...(query.unread === 'true' && { isRead: false }) };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
      include: { order: { select: { id: true, orderNumber: true, stallId: true } } },
    }),
    prisma.notification.count({ where }),
  ]);
  sendSuccess(res, items, 200, buildPaginationMeta(query.page, query.pageSize, total));
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const { stallId } = stallFilter.parse(req.query);
  const count = await prisma.notification.count({ where: { ...scopeOf(currentUser(req).id, stallId), isRead: false } });
  sendSuccess(res, { count });
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { count } = await prisma.notification.updateMany({ where: { id, userId: currentUser(req).id }, data: { isRead: true } });
  if (count === 0) throw AppError.notFound('Không tìm thấy thông báo');
  sendSuccess(res, { id, isRead: true });
});

notificationsRouter.post('/read-all', async (req, res) => {
  const { stallId } = stallFilter.parse(req.query);
  const { count } = await prisma.notification.updateMany({ where: { ...scopeOf(currentUser(req).id, stallId), isRead: false }, data: { isRead: true } });
  sendSuccess(res, { updated: count });
});
