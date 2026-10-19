import { apiClient, request } from '@/lib/api-client';
import type { ApiSuccess } from '@/types/api';
import type { Cart } from '@/types/models';

type CartResponse = ApiSuccess<Cart>;

export interface AddToCartPayload {
  menuItemId: number;
  quantity: number;
  note?: string;
  /** Đồng ý xoá giỏ của quầy khác để thêm món này */
  replaceCart?: boolean;
}

export const cartService = {
  get: () => request(apiClient.get<CartResponse>('/cart')),
  add: (payload: AddToCartPayload) => request(apiClient.post<CartResponse>('/cart/items', payload)),
  update: (id: number, payload: { quantity?: number; note?: string | null }) =>
    request(apiClient.patch<CartResponse>(`/cart/items/${id}`, payload)),
  remove: (id: number) => request(apiClient.delete<CartResponse>(`/cart/items/${id}`)),
  clear: () => request(apiClient.delete<CartResponse>('/cart')),
};
