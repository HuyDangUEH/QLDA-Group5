import { z } from 'zod';

export const MAX_QUANTITY_PER_ITEM = 20;
export const MAX_CART_LINES = 30;

const quantity = z.coerce
  .number({ error: 'Số lượng không hợp lệ' })
  .int('Số lượng phải là số nguyên')
  .min(1, 'Số lượng tối thiểu là 1')
  .max(MAX_QUANTITY_PER_ITEM, `Mỗi món tối đa ${MAX_QUANTITY_PER_ITEM} phần`);

const note = z
  .string()
  .trim()
  .max(255, 'Ghi chú tối đa 255 ký tự')
  .transform((v) => (v === '' ? null : v));

export const addCartItemSchema = z.object({
  menuItemId: z.coerce.number().int().positive(),
  quantity: quantity.default(1),
  note: note.optional(),
  /** true = đồng ý xoá giỏ hiện tại (của quầy khác) để thêm món này */
  replaceCart: z.boolean().default(false),
});

export const updateCartItemSchema = z
  .object({ quantity: quantity.optional(), note: note.nullable().optional() })
  .refine((d) => d.quantity !== undefined || d.note !== undefined, { message: 'Không có gì để cập nhật' });

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
