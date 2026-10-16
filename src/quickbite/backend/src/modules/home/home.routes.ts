import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { PROMOTIONS } from '../../config/promotions.js';
import { getStallRatings, menuItemInclude, toMenuItem, toStallSummary, visibleMenuItemWhere } from '../catalog/catalog.mappers.js';

export const homeRouter = Router();

/** Dữ liệu cho trang chủ trong 1 request: danh mục, quầy nổi bật, món bán chạy, món đề xuất, khuyến mãi */
homeRouter.get('/', async (_req, res) => {
  const [categories, stalls, popular, featured] = await Promise.all([
    prisma.foodCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, icon: true, description: true, _count: { select: { menuItems: { where: visibleMenuItemWhere } } } },
    }),
    prisma.foodStall.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.menuItem.findMany({
      where: { ...visibleMenuItemWhere, isAvailable: true },
      include: menuItemInclude,
      orderBy: [{ soldCount: 'desc' }, { id: 'asc' }],
      take: 8,
    }),
    prisma.menuItem.findMany({
      where: { ...visibleMenuItemWhere, isAvailable: true, isFeatured: true },
      include: menuItemInclude,
      orderBy: { soldCount: 'desc' },
      take: 8,
    }),
  ]);

  const ratings = await getStallRatings(stalls.map((s) => s.id));
  const stallSummaries = stalls
    .map((s) => toStallSummary(s, ratings.get(s.id)))
    // Quầy đang mở & điểm cao lên trước
    .sort((a, b) => Number(b.canOrderNow) - Number(a.canOrderNow) || (b.rating.average ?? 0) - (a.rating.average ?? 0));

  sendSuccess(res, {
    categories: categories.map(({ _count, ...c }) => ({ ...c, itemCount: _count.menuItems })),
    featuredStalls: stallSummaries.slice(0, 4),
    popularItems: popular.map(toMenuItem),
    featuredItems: featured.map(toMenuItem),
    promotions: PROMOTIONS,
  });
});
