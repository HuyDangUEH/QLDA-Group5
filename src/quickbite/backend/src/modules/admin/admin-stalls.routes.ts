import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import { TIME_REGEX } from '../../utils/opening-hours.js';
import { sendSuccess } from '../../utils/response.js';
import { slugify } from '../../utils/slugify.js';
import { idParamSchema } from '../../utils/validation.js';
import { getStallRatings, stallOpenState } from '../catalog/catalog.mappers.js';
import { imageUrlSchema } from '../vendor/vendor-menu.service.js';
import { audit } from './audit.js';

export const adminStallsRouter = Router();

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullish();

const stallBase = {
  name: z.string().trim().min(2, 'Tên quầy phải có ít nhất 2 ký tự').max(120, 'Tên quầy tối đa 120 ký tự'),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  description: nullableText(1000),
  location: z.string().trim().min(2, 'Vui lòng nhập vị trí').max(200),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ')
    .or(z.literal('').transform(() => null))
    .nullish(),
  openTime: z.string().regex(TIME_REGEX, 'Giờ phải có dạng HH:mm').default('07:00'),
  closeTime: z.string().regex(TIME_REGEX, 'Giờ phải có dạng HH:mm').default('20:00'),
  imageUrl: imageUrlSchema.or(z.literal('').transform(() => null)).nullish(),
  isActive: z.boolean().default(true),
};

export const createStallSchema = z.object(stallBase);
export const updateStallSchema = z
  .object({ ...stallBase, openTime: stallBase.openTime.unwrap(), closeTime: stallBase.closeTime.unwrap(), isActive: z.boolean() })
  .partial()
  .extend({ isAcceptingOrders: z.boolean().optional() });

export const stallMemberSchema = z.object({
  /** Chọn bằng email (tiện cho admin) hoặc userId */
  email: z.string().trim().toLowerCase().optional(),
  userId: z.coerce.number().int().positive().optional(),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
});

async function uniqueSlug(base: string, excludeId?: number) {
  const root = slugify(base) || 'quay';
  let slug = root;
  for (let i = 2; await prisma.foodStall.findFirst({ where: { slug, ...(excludeId && { id: { not: excludeId } }) }, select: { id: true } }); i++) {
    slug = `${root}-${i}`;
  }
  return slug;
}

const stallInclude = {
  memberships: { include: { user: { select: { id: true, fullName: true, email: true, status: true } } }, orderBy: { role: 'asc' } },
  _count: { select: { menuItems: { where: { isActive: true } }, orders: true } },
} satisfies Prisma.FoodStallInclude;

async function toAdminStall(stall: Prisma.FoodStallGetPayload<{ include: typeof stallInclude }>) {
  const rating = (await getStallRatings([stall.id])).get(stall.id) ?? { average: null, count: 0 };
  return { ...stall, ...stallOpenState(stall), rating };
}

adminStallsRouter.get('/', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(100).optional() }).parse(req.query);
  const stalls = await prisma.foodStall.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { location: { contains: q } }] } : {},
    include: stallInclude,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
  const ratings = await getStallRatings(stalls.map((s) => s.id));
  sendSuccess(res, stalls.map((s) => ({ ...s, ...stallOpenState(s), rating: ratings.get(s.id) ?? { average: null, count: 0 } })));
});

adminStallsRouter.post('/', async (req, res) => {
  const input = createStallSchema.parse(req.body);
  const slug = input.slug ? input.slug : await uniqueSlug(input.name);
  if (input.slug && (await prisma.foodStall.findUnique({ where: { slug } }))) {
    throw AppError.conflict('Slug đã được dùng', [{ field: 'slug', message: 'Slug đã được dùng cho quầy khác' }]);
  }
  const stall = await prisma.$transaction(async (tx) => {
    const created = await tx.foodStall.create({ data: { ...input, slug }, include: stallInclude });
    await audit({ req, action: 'STALL_CREATE', entityType: 'FoodStall', entityId: created.id, metadata: { name: created.name } }, tx);
    return created;
  });
  sendSuccess(res, { stall: await toAdminStall(stall) }, 201);
});

adminStallsRouter.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateStallSchema.parse(req.body);
  const before = await prisma.foodStall.findUnique({ where: { id } });
  if (!before) throw AppError.notFound('Không tìm thấy quầy');
  if (input.slug && (await prisma.foodStall.findFirst({ where: { slug: input.slug, id: { not: id } } }))) {
    throw AppError.conflict('Slug đã được dùng', [{ field: 'slug', message: 'Slug đã được dùng cho quầy khác' }]);
  }
  const stall = await prisma.$transaction(async (tx) => {
    const updated = await tx.foodStall.update({ where: { id }, data: input, include: stallInclude });
    // Quầy bị tắt → gỡ món của quầy khỏi giỏ hàng sinh viên
    if (input.isActive === false && before.isActive) {
      await tx.cartItem.deleteMany({ where: { menuItem: { stallId: id } } });
    }
    const changed = Object.keys(input).filter((k) => JSON.stringify(input[k as keyof typeof input]) !== JSON.stringify(before[k as keyof typeof before]));
    await audit({ req, action: 'STALL_UPDATE', entityType: 'FoodStall', entityId: id, metadata: { changed } }, tx);
    return updated;
  });
  sendSuccess(res, { stall: await toAdminStall(stall) });
});

// ─────────── Gán nhân viên cho quầy ───────────
adminStallsRouter.post('/:id/members', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = stallMemberSchema.parse(req.body);
  if (!input.email && !input.userId) throw AppError.badRequest('Vui lòng nhập email người dùng', [{ field: 'email', message: 'Vui lòng nhập email' }]);

  const stall = await prisma.foodStall.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!stall) throw AppError.notFound('Không tìm thấy quầy');
  const user = await prisma.user.findFirst({ where: input.userId ? { id: input.userId } : { email: input.email } });
  if (!user) throw AppError.notFound('Không tìm thấy người dùng với email này');
  if (user.role !== 'VENDOR') {
    throw AppError.unprocessable(`"${user.fullName}" chưa có vai trò Chủ quầy. Hãy đổi vai trò người dùng sang Chủ quầy trước.`, [
      { field: 'email', message: 'Người dùng chưa có vai trò Chủ quầy' },
    ]);
  }
  if (await prisma.vendorMembership.findUnique({ where: { userId_stallId: { userId: user.id, stallId: id } } })) {
    throw AppError.conflict('Người dùng này đã thuộc quầy', [{ field: 'email', message: 'Người dùng này đã thuộc quầy' }]);
  }

  await prisma.$transaction(async (tx) => {
    await tx.vendorMembership.create({ data: { userId: user.id, stallId: id, role: input.role } });
    await tx.notification.create({
      data: { userId: user.id, type: 'SYSTEM', title: 'Bạn được phân công quản lý quầy', message: `Bạn đã được thêm vào quầy "${stall.name}" với vai trò ${input.role === 'OWNER' ? 'chủ quầy' : 'nhân viên'}.` },
    });
    await audit({ req, action: 'STALL_MEMBER_ADD', entityType: 'FoodStall', entityId: id, metadata: { userId: user.id, email: user.email, role: input.role } }, tx);
  });
  const updated = await prisma.foodStall.findUniqueOrThrow({ where: { id }, include: stallInclude });
  sendSuccess(res, { stall: await toAdminStall(updated) }, 201);
});

adminStallsRouter.patch('/:id/members/:userId', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const userId = z.coerce.number().int().positive().parse(req.params.userId);
  const { role } = z.object({ role: z.enum(['OWNER', 'STAFF']) }).parse(req.body);
  const { count } = await prisma.vendorMembership.updateMany({ where: { stallId: id, userId }, data: { role } });
  if (count === 0) throw AppError.notFound('Người dùng không thuộc quầy này');
  await audit({ req, action: 'STALL_MEMBER_UPDATE', entityType: 'FoodStall', entityId: id, metadata: { userId, role } });
  const updated = await prisma.foodStall.findUniqueOrThrow({ where: { id }, include: stallInclude });
  sendSuccess(res, { stall: await toAdminStall(updated) });
});

adminStallsRouter.delete('/:id/members/:userId', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const userId = z.coerce.number().int().positive().parse(req.params.userId);
  const { count } = await prisma.vendorMembership.deleteMany({ where: { stallId: id, userId } });
  if (count === 0) throw AppError.notFound('Người dùng không thuộc quầy này');
  await audit({ req, action: 'STALL_MEMBER_REMOVE', entityType: 'FoodStall', entityId: id, metadata: { userId } });
  const updated = await prisma.foodStall.findUniqueOrThrow({ where: { id }, include: stallInclude });
  sendSuccess(res, { stall: await toAdminStall(updated) });
});
