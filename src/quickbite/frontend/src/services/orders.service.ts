import { apiClient, request, toApiError } from '@/lib/api-client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { Bank, Order, OrderSummary, PaymentMethod, PickupLocation } from '@/types/models';

export type OrderGroup = 'active' | 'completed' | 'cancelled';

export interface CreateOrderPayload {
  pickupLocationId: number;
  pickupTime: string | null;
  customerNote?: string;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export const ordersService = {
  pickupLocations: () => request(apiClient.get<ApiSuccess<PickupLocation[]>>('/pickup-locations')),

  /** Ngân hàng hỗ trợ VietQR */
  banks: () => request(apiClient.get<ApiSuccess<Bank[]>>('/payments/banks')),

  create: (payload: CreateOrderPayload) =>
    request(apiClient.post<ApiSuccess<{ order: Order; created: boolean }>>('/orders', payload)),

  async list(params: { group?: OrderGroup; page?: number; pageSize?: number }): Promise<{ orders: OrderSummary[]; meta: PaginationMeta }> {
    try {
      const res = await apiClient.get<ApiSuccess<OrderSummary[]>>('/orders', { params });
      return { orders: res.data.data, meta: res.data.meta! };
    } catch (error) {
      throw toApiError(error);
    }
  },

  detail: async (id: number) => (await request(apiClient.get<ApiSuccess<{ order: Order }>>(`/orders/${id}`))).order,

  review: async (id: number, input: { rating: number; comment?: string }) =>
    (await request(apiClient.post<ApiSuccess<{ review: { id: number; rating: number; comment: string | null; createdAt: string } }>>(`/orders/${id}/review`, input))).review,

  reportReview: (reviewId: number, reason: string) =>
    request(apiClient.post<ApiSuccess<{ message: string }>>(`/reviews/${reviewId}/report`, { reason })),

  cancel: async (id: number, reason?: string) =>
    (await request(apiClient.post<ApiSuccess<{ order: Order }>>(`/orders/${id}/cancel`, { reason }))).order,
};

export const orderKeys = {
  all: ['orders'] as const,
  list: (group: OrderGroup | undefined, page: number) => ['orders', 'list', group ?? 'all', page] as const,
  detail: (id: number) => ['orders', 'detail', id] as const,
  pickupLocations: ['pickup-locations'] as const,
  banks: ['payment-banks'] as const,
};
