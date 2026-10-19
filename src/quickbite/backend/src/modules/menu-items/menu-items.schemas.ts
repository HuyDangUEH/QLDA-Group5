import { z } from 'zod';

const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
const optionalId = z.coerce.number().int().positive().optional();
const optionalPrice = z.coerce.number({ error: 'Giá không hợp lệ' }).min(0, 'Giá không được âm').max(10_000_000).optional();

export const MENU_SORTS = ['popular', 'price_asc', 'price_desc', 'newest', 'name'] as const;

export const listMenuItemsQuery = z
  .object({
    q: z.string().trim().max(100).optional(),
    categoryId: optionalId,
    stallId: optionalId,
    /** Lọc theo slug (ổn định hơn ID, dùng cho URL đẹp): ?category=do-uong&stall=bep-nha-sinh-vien */
    category: z.string().trim().max(100).optional(),
    stall: z.string().trim().max(140).optional(),
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    available: booleanQuery.optional(),
    featured: booleanQuery.optional(),
    sort: z.enum(MENU_SORTS).default('popular'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    path: ['maxPrice'],
    message: 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu',
  });

export type ListMenuItemsQuery = z.infer<typeof listMenuItemsQuery>;
