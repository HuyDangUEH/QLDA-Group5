import { apiClient, request, toApiError } from '@/lib/api-client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { AppNotification } from '@/types/vendor';

export const notificationsService = {
  /** stallId: chỉ thông báo về đơn của quầy đó (trang thông báo của chủ quầy) */
  async list(params: { page?: number; pageSize?: number; unread?: boolean; stallId?: number }): Promise<{ items: AppNotification[]; meta: PaginationMeta }> {
    try {
      const res = await apiClient.get<ApiSuccess<AppNotification[]>>('/notifications', {
        params: { page: params.page, pageSize: params.pageSize, ...(params.unread && { unread: 'true' }), ...(params.stallId && { stallId: params.stallId }) },
      });
      return { items: res.data.data, meta: res.data.meta! };
    } catch (error) {
      throw toApiError(error);
    }
  },
  unreadCount: async (stallId?: number) =>
    (await request(apiClient.get<ApiSuccess<{ count: number }>>('/notifications/unread-count', { params: stallId ? { stallId } : undefined }))).count,
  markRead: (id: number) => request(apiClient.patch<ApiSuccess<{ id: number }>>(`/notifications/${id}/read`)),
  markAllRead: (stallId?: number) =>
    request(apiClient.post<ApiSuccess<{ updated: number }>>('/notifications/read-all', undefined, { params: stallId ? { stallId } : undefined })),
};

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
  unreadForStall: (stallId: number) => ['notifications', 'unread-count', stallId] as const,
  list: (page: number, unread: boolean, stallId?: number) => ['notifications', 'list', page, unread, stallId ?? 'all'] as const,
};
