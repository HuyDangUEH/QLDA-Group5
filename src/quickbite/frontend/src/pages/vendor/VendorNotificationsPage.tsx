import { useState } from 'react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useCurrentUser } from '@/features/auth/hooks';
import { NotificationList } from '@/features/notifications/NotificationList';
import { notificationLink, useMarkAllRead, useMarkRead, useUnreadCount } from '@/features/notifications/hooks';
import { useCurrentStallId, useVendorStall } from '@/features/vendor/vendor-stall-context';
import { toApiError } from '@/lib/api-client';
import { notificationKeys, notificationsService } from '@/services/notifications.service';
import type { AppNotification } from '@/types/vendor';
import { cn } from '@/lib/utils';

/** Thông báo của quầy đang chọn: đơn mới, đơn bị huỷ, tiền chuyển khoản về… Bấm vào để mở đơn. */
export function VendorNotificationsPage() {
  const stallId = useCurrentStallId();
  const { stall } = useVendorStall();
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const { data: unread = 0 } = useUnreadCount(stallId);

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: notificationKeys.list(page, unreadOnly, stallId),
    queryFn: () => notificationsService.list({ page, pageSize: 15, unread: unreadOnly, stallId }),
    placeholderData: keepPreviousData,
    // Đơn mới đến liên tục → làm mới định kỳ
    refetchInterval: 30_000,
  });

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const link = user && notificationLink(n, user.role);
    if (link) navigate(link);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Thông báo</h1>
          <p className="mt-1 text-navy-500">
            Đơn mới, đơn bị huỷ, tiền chuyển khoản về… của quầy <span className="font-semibold text-navy-800">{stall?.name}</span>
            {unread > 0 && ` · ${unread} chưa đọc`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={markAll.isPending}
          disabled={unread === 0}
          onClick={() =>
            markAll.mutate(stallId, {
              onSuccess: (r) => toast.success(`Đã đánh dấu ${r.updated} thông báo là đã đọc`),
              onError: (e) => toast.error(toApiError(e).message),
            })
          }
        >
          <CheckCheck className="size-4" aria-hidden /> Đánh dấu tất cả đã đọc
        </Button>
      </div>

      <div role="tablist" aria-label="Lọc thông báo" className="flex gap-2">
        {[
          { value: false, label: 'Tất cả' },
          { value: true, label: `Chưa đọc${unread > 0 ? ` (${unread})` : ''}` },
        ].map((t) => (
          <button
            key={String(t.value)}
            type="button"
            role="tab"
            aria-selected={unreadOnly === t.value}
            onClick={() => {
              setUnreadOnly(t.value);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold',
              unreadOnly === t.value ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-gray-200 hover:ring-brand-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={cn('transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-(--radius-card)" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-7" aria-hidden />}
            title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Quầy chưa có thông báo nào'}
            description="Khi có đơn mới hoặc đơn thay đổi trạng thái, thông báo sẽ hiện ở đây."
          />
        ) : (
          <>
            <NotificationList items={data.items} onOpen={open} />
            {data.meta.totalPages > 1 && (
              <div className="mt-6">
                <Pagination meta={data.meta} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
