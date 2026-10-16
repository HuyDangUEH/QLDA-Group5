import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import { toSkipTake } from '../../utils/validation.js';
import { menuItemInclude, toMenuItem, visibleMenuItemWhere } from '../catalog/catalog.mappers.js';
import type { ListMenuItemsQuery } from './menu-items.schemas.js';

const ORDER_BY: Record<ListMenuItemsQuery['sort'], Prisma.MenuItemOrderByWithRelationInput[]> = {
  popular: [{ soldCount: 'desc' }, { id: 'asc' }],
  price_asc: [{ price: 'asc' }, { id: 'asc' }],
  price_desc: [{ price: 'desc' }, { id: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  name: [{ name: 'asc' }, { id: 'asc' }],
};

export const menuItemsService = {
  /**
   * Tìm kiếm & lọc món ăn.
   * Collation utf8mb4_unicode_ci của MySQL so sánh không phân biệt hoa thường VÀ dấu,
   * nên tìm "pho" vẫn ra "Phở".
   */
  async list(query: ListMenuItemsQuery) {
    const where: Prisma.MenuItemWhereInput = {
      ...visibleMenuItemWhere,
      categoryId: query.categoryId,
      stallId: query.stallId,
      ...(query.category && { category: { ...visibleMenuItemWhere.category, slug: query.category } }),
      ...(query.stall && { stall: { ...visibleMenuItemWhere.stall, slug: query.stall } }),
      ...(query.available && { isAvailable: true }),
      ...(query.featured && { isFeatured: true }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        price: { gte: query.minPrice, lte: query.maxPrice },
      }),
      ...(query.q && { OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }] }),
    };

    const [items, total] = await Promise.all([
      prisma.menuItem.findMany({ where, include: menuItemInclude, orderBy: ORDER_BY[query.sort], ...toSkipTake(query) }),
      prisma.menuItem.count({ where }),
    ]);
    return { items: items.map(toMenuItem), total };
  },

  async detail(id: number) {
    const item = await prisma.menuItem.findFirst({
      where: { ...visibleMenuItemWhere, id },
      include: { ...menuItemInclude, stall: { select: { ...menuItemInclude.stall.select, location: true } } },
    });
    if (!item) throw AppError.notFound('Không tìm thấy món ăn');

    // Gợi ý thêm món cùng quầy
    const related = await prisma.menuItem.findMany({
      where: { ...visibleMenuItemWhere, stallId: item.stallId, id: { not: item.id } },
      include: menuItemInclude,
      orderBy: [{ isAvailable: 'desc' }, { soldCount: 'desc' }],
      take: 4,
    });

    const mapped = toMenuItem(item);
    return {
      item: { ...mapped, stall: { ...mapped.stall, location: item.stall.location } },
      related: related.map(toMenuItem),
    };
  },
};
