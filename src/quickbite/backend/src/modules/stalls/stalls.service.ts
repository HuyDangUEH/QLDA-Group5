import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import {
  PUBLIC_REVIEW_STATUSES,
  getStallRatings,
  menuItemInclude,
  toMenuItem,
  toStallSummary,
  visibleMenuItemWhere,
} from '../catalog/catalog.mappers.js';

export const stallsService = {
  async list({ q }: { q?: string }) {
    const where: Prisma.FoodStallWhereInput = {
      isActive: true,
      ...(q && { OR: [{ name: { contains: q } }, { description: { contains: q } }, { location: { contains: q } }] }),
    };
    const stalls = await prisma.foodStall.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { menuItems: { where: { isActive: true } } } } },
    });
    const ratings = await getStallRatings(stalls.map((s) => s.id));
    return stalls.map((s) => toStallSummary(s, ratings.get(s.id), { menuItemCount: s._count.menuItems }));
  },

  /** Chi tiết quầy theo ID hoặc slug, kèm toàn bộ thực đơn và đánh giá gần đây */
  async detail(idOrSlug: string) {
    const where: Prisma.FoodStallWhereInput = /^\d+$/.test(idOrSlug)
      ? { id: Number(idOrSlug), isActive: true }
      : { slug: idOrSlug, isActive: true };
    const stall = await prisma.foodStall.findFirst({ where });
    if (!stall) throw AppError.notFound('Không tìm thấy quầy ăn');

    const [ratings, items, reviews] = await Promise.all([
      getStallRatings([stall.id]),
      prisma.menuItem.findMany({
        where: { ...visibleMenuItemWhere, stallId: stall.id },
        include: menuItemInclude,
        orderBy: [{ category: { sortOrder: 'asc' } }, { isFeatured: 'desc' }, { soldCount: 'desc' }, { name: 'asc' }],
      }),
      prisma.review.findMany({
        where: { stallId: stall.id, status: { in: PUBLIC_REVIEW_STATUSES } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, rating: true, comment: true, createdAt: true, student: { select: { fullName: true } } },
      }),
    ]);

    const menuItems = items.map(toMenuItem);
    // Danh mục có món trong quầy, giữ đúng thứ tự sắp xếp
    const categories = [...new Map(menuItems.map((m) => [m.category.id, m.category])).values()];

    return {
      stall: toStallSummary(stall, ratings.get(stall.id), { menuItemCount: menuItems.length }),
      categories,
      menuItems,
      // Chỉ hiển thị tên (không hiển thị email) của người đánh giá
      reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, author: r.student.fullName })),
    };
  },
};
