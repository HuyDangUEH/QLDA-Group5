import { apiClient, request, toApiError } from '@/lib/api-client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { AppNotification } from '@/types/vendor';

export const notificationsService = {
  async list(params: { page?: number; pageSize?: number; unread?: boolean }): Promise<{ items: AppNotification[]; meta: PaginationMeta }> {
    try {
      const res = await apiClient.get<ApiSuccess<AppNotification[]>>('/notifications', {
        params: { page: params.page, pageSize: params.pageSize, ...(params.unread && { unread: 'true' }) },
      });
      return { items: res.data.data, meta: res.data.meta! };
    } catch (error) {
      throw toApiError(error);
    }
  },
  unreadCount: async () => (await request(apiClient.get<ApiSuccess<{ count: number }>>('/notifications/unread-count'))).count,
  markRead: (id: number) => request(apiClient.patch<ApiSuccess<{ id: number }>>(`/notifications/${id}/read`)),
  markAllRead: () => request(apiClient.post<ApiSuccess<{ updated: number }>>('/notifications/read-all')),
};

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
  list: (page: number, unread: boolean) => ['notifications', 'list', page, unread] as const,
};
