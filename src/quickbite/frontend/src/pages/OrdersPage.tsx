import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { buttonClass } from '@/components/ui/styles';
import { orderKeys, ordersService, type OrderGroup } from '@/services/orders.service';
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge';
import { isActiveStatus } from '@/features/orders/order-labels';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

const TABS: { value: OrderGroup | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Đang xử lý' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const group = (TABS.find((t) => t.value === params.get('nhom'))?.value || undefined) as OrderGroup | undefined;
  const page = Math.max(1, Number(params.get('trang')) || 1);

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: orderKeys.list(group, page),
    queryFn: () => ordersService.list({ group, page, pageSize: 10 }),
    placeholderData: keepPreviousData,
    // Đơn đang xử lý có thể đổi trạng thái → làm mới định kỳ
    refetchInterval: (query) => (query.state.data?.orders.some((o) => isActiveStatus(o.status)) ? 30_000 : false),
  });

  const setTab = (value: string) => setParams(value ? { nhom: value } : {});

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <h1 className="text-3xl font-extrabold">Đơn hàng của tôi</h1>

      <div role="tablist" aria-label="Lọc đơn hàng" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = (group ?? '') === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                active ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-gray-200 hover:ring-brand-300',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className={cn('mt-6 transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-(--radius-card)" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.orders.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="size-7" aria-hidden />}
            title={group ? 'Không có đơn nào trong mục này' : 'Bạn chưa có đơn hàng nào'}
            description="Đặt món đầu tiên của bạn ngay hôm nay!"
            action={
              <Link to="/mon-an" className={buttonClass()}>
                Khám phá món ăn
              </Link>
            }
          />
        ) : (
          <>
            <ul className="space-y-3">
              {data.orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/don-hang/${o.id}`} className="block">
                    <Card className="flex gap-4 p-4 transition hover:shadow-(--shadow-card-hover)">
                      <ImageWithFallback src={o.stall.imageUrl ?? undefined} alt="" className="hidden size-20 shrink-0 rounded-xl object-cover sm:block" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">{o.stall.name}</p>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <p className="mt-1 truncate text-sm text-navy-600">
                          {o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-navy-500">
                            <span className="font-mono">{o.orderNumber}</span> · {formatDateTime(o.createdAt)}
                          </span>
                          <span className="font-extrabold">{formatCurrency(o.total)}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 self-center text-navy-300" aria-hidden />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
            {data.meta.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  meta={data.meta}
                  onPageChange={(p) => setParams({ ...(group && { nhom: group }), trang: String(p) })}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
