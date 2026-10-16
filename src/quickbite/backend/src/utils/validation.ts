import { z } from 'zod';

/** ID dạng số nguyên dương trong URL, vd /stalls/:id */
export const idParamSchema = z.object({
  id: z.coerce.number({ error: 'ID không hợp lệ' }).int('ID không hợp lệ').positive('ID không hợp lệ'),
});

/** Tham số phân trang chung: ?page=1&pageSize=20 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function toSkipTake({ page, pageSize }: { page: number; pageSize: number }) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
