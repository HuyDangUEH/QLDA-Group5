import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks';
import { notificationKeys, notificationsService } from '@/services/notifications.service';
import type { Role } from '@/features/auth/types';
import type { AppNotification } from '@/types/vendor';

/** Số thông báo chưa đọc, làm mới mỗi 30 giây */
export function useUnreadCount() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: notificationsService.unreadCount,
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

/** Đường dẫn khi bấm vào thông báo, tuỳ vai trò người xem */
export function notificationLink(n: AppNotification, role: Role): string | null {
  if (!n.order) return null;
  if (role === 'STUDENT') return `/don-hang/${n.order.id}`;
  return `/quan-ly/don-hang?order=${n.order.id}&quay=${n.order.stallId}`;
}
