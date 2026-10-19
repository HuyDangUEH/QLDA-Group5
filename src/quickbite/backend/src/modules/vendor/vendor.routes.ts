import { Router } from 'express';
import { z } from 'zod';
import { authenticate, currentUser, requireRole } from '../../middlewares/auth.js';
import { requireStallAccess, requireStallOwner, type StallAccessRole } from '../../middlewares/stall-access.js';
import { prisma } from '../../lib/prisma.js';
import { buildPaginationMeta, sendSuccess } from '../../utils/response.js';
import { TIME_REGEX } from '../../utils/opening-hours.js';
import { stallOpenState } from '../catalog/catalog.mappers.js';
import type { OrderActor } from '../orders/order-status.js';
import { transitionOrder } from '../orders/order-workflow.js';
import { imageUpload, saveImage } from './upload.js';
import { uploadRateLimiter } from '../../middlewares/rate-limit.js';
import { createMenuItemSchema, imageUrlSchema, listMenuQuery, updateMenuItemSchema, vendorMenuService } from './vendor-menu.service.js';
import { listVendorOrdersQuery, updateOrderStatusSchema, vendorOrdersService } from './vendor-orders.service.js';
import { reportQuery, vendorReportsService } from './vendor-reports.service.js';

/**
 * API dành cho chủ quầy / nhân viên quầy (admin dùng được với mọi quầy).
 * Mọi route theo quầy nằm dưới /vendor/stalls/:stallId và đều đi qua requireStallAccess.
 */
export const vendorRouter = Router();

vendorRouter.use(authenticate, requireRole('VENDOR', 'ADMIN'));

// Danh sách quầy mà người dùng hiện tại quản lý
vendorRouter.get('/stalls', async (req, res) => {
  const user = currentUser(req);
  const stalls = await prisma.foodStall.findMany({
    where: user.role === 'ADMIN' ? {} : { memberships: { some: { userId: user.id } } },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, { stalls: stalls.map((s) => ({ ...s, ...stallOpenState(s) })) });
});

// ─────────── Các route trong phạm vi một quầy ───────────
const stall = Router({ mergeParams: true });
vendorRouter.use('/stalls/:stallId', requireStallAccess, stall);

const stallId = (res: { locals: Record<string, unknown> }) => res.locals.stallId as number;
const actorOf = (res: { locals: Record<string, unknown> }): OrderActor =>
  (res.locals.stallRole as StallAccessRole) === 'ADMIN' ? 'ADMIN' : 'STALL_STAFF';
const idOf = (raw: unknown, name = 'id') => z.coerce.number().int().positive(`${name} không hợp lệ`).parse(raw);

// Thông tin quầy + nhân viên
stall.get('/', async (_req, res) => {
  const data = await prisma.foodStall.findUniqueOrThrow({
    where: { id: stallId(res) },
    include: {
      memberships: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      _count: { select: { menuItems: { where: { isActive: true } }, orders: true } },
    },
  });
  sendSuccess(res, { stall: { ...data, ...stallOpenState(data) }, myRole: res.locals.stallRole });
});

export const vendorUpdateStallSchema = z
  .object({
    description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').nullish(),
    phone: z
      .string()
      .trim()
      .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ')
      .or(z.literal('').transform(() => null))
      .nullish(),
    openTime: z.string().regex(TIME_REGEX, 'Giờ phải có dạng HH:mm').optional(),
    closeTime: z.string().regex(TIME_REGEX, 'Giờ phải có dạng HH:mm').optional(),
    imageUrl: imageUrlSchema.nullish(),
    isAcceptingOrders: z.boolean().optional(),
  })
  .refine((d) => !d.openTime || !d.closeTime || d.openTime !== d.closeTime || d.openTime === '00:00', {
    path: ['closeTime'],
    message: 'Giờ đóng cửa phải khác giờ mở cửa (dùng 00:00 – 00:00 nếu mở cả ngày)',
  });

// Chủ quầy cập nhật thông tin quầy (tên & vị trí do admin quản lý)
stall.patch('/', requireStallOwner, async (req, res) => {
  const input = vendorUpdateStallSchema.parse(req.body);
  const updated = await prisma.foodStall.update({ where: { id: stallId(res) }, data: input });
  sendSuccess(res, { stall: { ...updated, ...stallOpenState(updated) } });
});

// Bật / tắt nhận đơn nhanh (nhân viên cũng được dùng, vd khi hết nguyên liệu)
stall.patch('/accepting-orders', async (req, res) => {
  const { isAcceptingOrders } = z.object({ isAcceptingOrders: z.boolean() }).parse(req.body);
  const updated = await prisma.foodStall.update({ where: { id: stallId(res) }, data: { isAcceptingOrders } });
  sendSuccess(res, { stall: { ...updated, ...stallOpenState(updated) } });
});

stall.get('/dashboard', async (_req, res) => {
  sendSuccess(res, await vendorReportsService.dashboard(stallId(res)));
});

stall.get('/reports', async (req, res) => {
  sendSuccess(res, await vendorReportsService.report(stallId(res), reportQuery.parse(req.query)));
});

// ─────────── Đơn hàng ───────────
stall.get('/orders', async (req, res) => {
  const query = listVendorOrdersQuery.parse(req.query);
  const { orders, total, tabCounts } = await vendorOrdersService.list(stallId(res), query, actorOf(res));
  res.json({ success: true, data: orders, meta: { ...buildPaginationMeta(query.page, query.pageSize, total), tabCounts } });
});

stall.get('/orders/:orderId', async (req, res) => {
  sendSuccess(res, { order: await vendorOrdersService.detail(stallId(res), idOf(req.params.orderId, 'Mã đơn'), actorOf(res)) });
});

stall.patch('/orders/:orderId/status', async (req, res) => {
  const { status, reason } = updateOrderStatusSchema.parse(req.body);
  const order = await transitionOrder({
    orderId: idOf(req.params.orderId, 'Mã đơn'),
    stallId: stallId(res),
    to: status,
    actor: actorOf(res),
    userId: currentUser(req).id,
    reason,
  });
  sendSuccess(res, { order });
});

// ─────────── Thực đơn ───────────
stall.get('/menu-items', async (req, res) => {
  sendSuccess(res, await vendorMenuService.list(stallId(res), listMenuQuery.parse(req.query)));
});

stall.post('/menu-items', async (req, res) => {
  sendSuccess(res, await vendorMenuService.create(stallId(res), createMenuItemSchema.parse(req.body)), 201);
});

stall.patch('/menu-items/:itemId', async (req, res) => {
  sendSuccess(res, await vendorMenuService.update(stallId(res), idOf(req.params.itemId, 'Mã món'), updateMenuItemSchema.parse(req.body)));
});

// Ngừng kinh doanh món (xoá mềm, giữ lịch sử đơn)
stall.delete('/menu-items/:itemId', async (req, res) => {
  sendSuccess(res, await vendorMenuService.deactivate(stallId(res), idOf(req.params.itemId, 'Mã món')));
});

// Tải ảnh món / ảnh quầy (multipart, trường "image")
stall.post('/uploads', uploadRateLimiter, imageUpload, async (req, res) => {
  const folder = req.query.type === 'stall' ? 'stalls' : 'menu';
  sendSuccess(res, { url: await saveImage(req.file, folder) }, 201);
});
