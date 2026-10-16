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
import { notificationLink, useMarkAllRead, useMarkRead } from '@/features/notifications/hooks';
import { toApiError } from '@/lib/api-client';
import { notificationKeys, notificationsService } from '@/services/notifications.service';
import type { AppNotification } from '@/types/vendor';
import { cn, formatDateTime } from '@/lib/utils';

export function NotificationsPage() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: notificationKeys.list(page, unreadOnly),
    queryFn: () => notificationsService.list({ page, pageSize: 15, unread: unreadOnly }),
    placeholderData: keepPreviousData,
  });

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const link = user && notificationLink(n, user.role);
    if (link) navigate(link);
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Thông báo</h1>
        <Button
          variant="outline"
          size="sm"
          loading={markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: (r) => toast.success(r.updated > 0 ? `Đã đánh dấu ${r.updated} thông báo là đã đọc` : 'Không có thông báo chưa đọc'),
              onError: (e) => toast.error(toApiError(e).message),
            })
          }
        >
          <CheckCheck className="size-4" aria-hidden /> Đánh dấu tất cả đã đọc
        </Button>
      </div>

      <div role="tablist" aria-label="Lọc thông báo" className="mt-5 flex gap-2">
        {[
          { value: false, label: 'Tất cả' },
          { value: true, label: 'Chưa đọc' },
        ].map((t) => (
          <button
            key={t.label}
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

      <div className={cn('mt-6 transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-(--radius-card)" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={<Bell className="size-7" aria-hidden />} title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'} />
        ) : (
          <>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-(--radius-card) border border-gray-100 bg-white shadow-(--shadow-card)">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cn('flex w-full gap-3 p-4 text-left transition hover:bg-gray-50', !n.isRead && 'bg-brand-50/50')}
                  >
                    <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand-500')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block', !n.isRead && 'font-bold')}>
                        {n.title}
                        {!n.isRead && <span className="sr-only"> (chưa đọc)</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-navy-600">{n.message}</span>
                      <span className="mt-1 block text-xs text-navy-400">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {data.meta.totalPages > 1 && (
              <div className="mt-6">
                <Pagination meta={data.meta} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
