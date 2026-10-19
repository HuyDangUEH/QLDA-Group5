import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Banknote, ClipboardList, Store, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { PageHeader } from '@/features/admin/PageHeader';
import { StatCard } from '@/features/vendor/StatCard';
import { ORDER_STATUS_LABELS } from '@/features/orders/order-labels';
import { adminKeys, adminService } from '@/services/admin.service';
import type { OrderStatus } from '@/types/models';
import { formatCurrency, formatDate } from '@/lib/utils';

const RevenueChart = lazy(() => import('@/features/vendor/RevenueChart').then((m) => ({ default: m.RevenueChart })));

const STATUS_ORDER: OrderStatus[] = ['COMPLETED', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'CANCELLED', 'REJECTED'];

export function AdminDashboardPage() {
  const { data: d, isPending, error, refetch } = useQuery({ queryKey: adminKeys.dashboard, queryFn: adminService.dashboard, refetchInterval: 60_000 });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan hệ thống" description={d ? `Hôm nay, ${formatDate(`${d.date}T12:00:00+07:00`)}` : 'Đang tải...'} />

      {d && d.reportedReviews > 0 && (
        <Link
          to="/quan-tri/danh-gia"
          className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-100 hover:bg-red-100"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Có {d.reportedReviews} đánh giá bị báo cáo đang chờ kiểm duyệt
          <ArrowRight className="ml-auto size-4" aria-hidden />
        </Link>
      )}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-(--radius-card)" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Doanh thu hôm nay" value={formatCurrency(d.revenue.today)} hint={`30 ngày: ${formatCurrency(d.revenue.last30Days)}`} icon={Banknote} tone="success" />
          <StatCard label="Đơn hôm nay" value={d.orders.today} hint={`${d.orders.active} đơn đang xử lý`} icon={ClipboardList} tone="brand" />
          <StatCard
            label="Người dùng"
            value={d.users.total}
            hint={`${d.users.byRole.STUDENT ?? 0} SV · ${d.users.byRole.VENDOR ?? 0} chủ quầy · ${d.users.suspended} bị khoá`}
            icon={Users}
          />
          <StatCard label="Quầy đang hoạt động" value={d.stalls.active} hint={d.stalls.inactive > 0 ? `${d.stalls.inactive} quầy đã tắt` : undefined} icon={Store} />
        </div>
      )}

      <Card className="p-5">
        <h2 className="font-bold">Doanh thu toàn hệ thống — 14 ngày gần nhất</h2>
        <div className="mt-4">
          {isPending ? (
            <Skeleton className="h-72" />
          ) : (
            <Suspense fallback={<Skeleton className="h-72" />}>
              <RevenueChart series={d.series} />
            </Suspense>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Quầy doanh thu cao nhất (30 ngày)</h2>
          {isPending ? (
            <Skeleton className="mt-4 h-40" />
          ) : d.topStalls.length === 0 ? (
            <p className="mt-3 text-sm text-navy-500">Chưa có đơn hoàn thành trong 30 ngày qua.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">Quầy doanh thu cao nhất</caption>
              <thead className="text-left text-xs text-navy-500 uppercase">
                <tr>
                  <th scope="col" className="py-2 font-semibold">Quầy</th>
                  <th scope="col" className="py-2 text-right font-semibold">Đơn</th>
                  <th scope="col" className="py-2 text-right font-semibold">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 tabular-nums">
                {d.topStalls.map((s) => (
                  <tr key={s.stallId}>
                    <td className="py-2.5 font-medium">{s.name}</td>
                    <td className="py-2.5 text-right">{s.orders}</td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Trạng thái đơn (30 ngày)</h2>
          {isPending ? (
            <Skeleton className="mt-4 h-40" />
          ) : (
            <dl className="mt-3 divide-y divide-gray-100 text-sm">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex justify-between py-2">
                  <dt className="text-navy-600">{ORDER_STATUS_LABELS[s]}</dt>
                  <dd className="font-semibold tabular-nums">{d.orders.last30Days[s] ?? 0}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}
