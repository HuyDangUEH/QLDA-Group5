import type { FoodCategory, FoodStall, MenuItem, Prisma, ReviewStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { isWithinOpeningHours } from '../../utils/opening-hours.js';

/**
 * Đánh giá hiển thị công khai. Đánh giá bị báo cáo VẪN hiển thị cho tới khi admin quyết định ẩn,
 * để một người dùng không thể tự ý ẩn đánh giá của người khác bằng cách báo cáo.
 */
export const PUBLIC_REVIEW_STATUSES: ReviewStatus[] = ['VISIBLE', 'REPORTED'];

export interface StallRating {
  average: number | null;
  count: number;
}

/** Điểm đánh giá trung bình (chỉ đánh giá đang hiển thị) theo từng quầy */
export async function getStallRatings(stallIds: number[]): Promise<Map<number, StallRating>> {
  if (stallIds.length === 0) return new Map();
  const rows = await prisma.review.groupBy({
    by: ['stallId'],
    where: { stallId: { in: stallIds }, status: { in: PUBLIC_REVIEW_STATUSES } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [
      r.stallId,
      { average: r._avg.rating === null ? null : Math.round(r._avg.rating * 10) / 10, count: r._count._all },
    ]),
  );
}

/** Quầy có nhận đơn ngay lúc này không: đang hoạt động, chủ quầy bật nhận đơn và trong giờ mở cửa */
export function stallOpenState(stall: Pick<FoodStall, 'isActive' | 'isAcceptingOrders' | 'openTime' | 'closeTime'>) {
  const isOpenNow = isWithinOpeningHours(stall.openTime, stall.closeTime);
  return { isOpenNow, canOrderNow: stall.isActive && stall.isAcceptingOrders && isOpenNow };
}

export function toStallSummary(stall: FoodStall, rating?: StallRating, extra: { menuItemCount?: number } = {}) {
  return {
    id: stall.id,
    name: stall.name,
    slug: stall.slug,
    description: stall.description,
    imageUrl: stall.imageUrl,
    location: stall.location,
    phone: stall.phone,
    openTime: stall.openTime,
    closeTime: stall.closeTime,
    isAcceptingOrders: stall.isAcceptingOrders,
    ...stallOpenState(stall),
    rating: rating ?? { average: null, count: 0 },
    ...(extra.menuItemCount !== undefined && { menuItemCount: extra.menuItemCount }),
  };
}

type MenuItemWithRelations = MenuItem & {
  category: Pick<FoodCategory, 'id' | 'name' | 'slug'>;
  stall: Pick<FoodStall, 'id' | 'name' | 'slug' | 'isActive' | 'isAcceptingOrders' | 'openTime' | 'closeTime'>;
};

export function toMenuItem(item: MenuItemWithRelations) {
  const { isOpenNow, canOrderNow } = stallOpenState(item.stall);
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    soldCount: item.soldCount,
    category: item.category,
    stall: { id: item.stall.id, name: item.stall.name, slug: item.stall.slug, isOpenNow },
    /** Có thể đặt ngay: món còn hàng và quầy đang nhận đơn */
    canOrder: item.isAvailable && canOrderNow,
  };
}

/** Prisma include dùng chung khi lấy món ăn */
export const menuItemInclude = {
  category: { select: { id: true, name: true, slug: true } },
  stall: { select: { id: true, name: true, slug: true, isActive: true, isAcceptingOrders: true, openTime: true, closeTime: true } },
} satisfies Prisma.MenuItemInclude;

/** Điều kiện chung: chỉ hiển thị món đang kinh doanh, thuộc quầy & danh mục đang hoạt động */
export const visibleMenuItemWhere = {
  isActive: true,
  stall: { isActive: true },
  category: { isActive: true },
} satisfies Prisma.MenuItemWhereInput;
