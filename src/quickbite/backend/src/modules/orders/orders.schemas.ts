import { z } from 'zod';

export const createOrderSchema = z.object({
  pickupLocationId: z.coerce.number({ error: 'Vui lòng chọn điểm nhận món' }).int().positive('Vui lòng chọn điểm nhận món'),
  /** ISO datetime; null/bỏ trống = nhận sớm nhất có thể */
  pickupTime: z.iso.datetime({ offset: true, error: 'Giờ nhận món không hợp lệ' }).nullish(),
  customerNote: z
    .string()
    .trim()
    .max(500, 'Ghi chú tối đa 500 ký tự')
    .transform((v) => (v === '' ? null : v))
    .nullish(),
  paymentMethod: z.enum(['CASH_ON_PICKUP', 'VIETQR'], { error: 'Phương thức thanh toán không được hỗ trợ' }).default('CASH_ON_PICKUP'),
  /** Client tạo 1 UUID cho mỗi lần thanh toán; gửi lại cùng khoá sẽ không tạo đơn trùng */
  idempotencyKey: z.string().trim().min(8).max(64).regex(/^[\w-]+$/, 'Khoá chống trùng không hợp lệ'),
});

export const listOrdersQuery = z.object({
  /** active = đang xử lý, completed = đã hoàn thành, cancelled = đã huỷ/bị từ chối */
  group: z.enum(['active', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(255, 'Lý do tối đa 255 ký tự').optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
