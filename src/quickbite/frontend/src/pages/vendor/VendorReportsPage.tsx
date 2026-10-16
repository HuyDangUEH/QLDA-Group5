import { lazy, Suspense, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Banknote, CheckCircle2, ClipboardList, Receipt } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { inputClass } from '@/components/ui/styles';
import { StatCard } from '@/features/vendor/StatCard';
import { useCurrentStallId } from '@/features/vendor/vendor-stall-context';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import { cn, formatCurrency } from '@/lib/utils';

// Thư viện biểu đồ khá nặng → chỉ tải khi mở trang báo cáo
const RevenueChart = lazy(() => import('@/features/vendor/RevenueChart').then((m) => ({ default: m.RevenueChart })));

/** Ngày hôm nay theo giờ Việt Nam, YYYY-MM-DD */
const vnToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

type Preset = '7d' | '30d' | 'month' | 'custom';
const PRESETS: { value: Preset; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Tuỳ chọn' },
];

function presetRange(preset: Exclude<Preset, 'custom'>) {
  const today = vnToday();
  if (preset === '7d') return { from: addDays(today, -6), to: today };
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

const shortDate = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

export function VendorReportsPage() {
  const stallId = useCurrentStallId();
  const [preset, setPreset] = useState<Preset>('7d');
  const [custom, setCustom] = useState(() => presetRange('7d'));
  const [showTable, setShowTable] = useState(false);
  const range = preset === 'custom' ? custom : presetRange(preset);
  const validRange = range.from <= range.to;

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: vendorKeys.reports(stallId, range),
    queryFn: () => vendorService.reports(stallId, range),
    placeholderData: keepPreviousData,
    enabled: validRange,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Báo cáo doanh thu</h1>
        <p className="mt-1 text-navy-500">Doanh thu chỉ tính các đơn đã hoàn thành (đã giao & thu tiền).</p>
      </div>

      {/* Bộ lọc thời gian: một hàng phía trên biểu đồ */}
      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="Khoảng thời gian" className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={preset === p.value}
              onClick={() => {
                if (p.value === 'custom') setCustom(range);
                setPreset(p.value);
              }}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', preset === p.value ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-gray-100')}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-xs font-medium text-navy-500">
                Từ ngày
              </label>
              <input id="report-from" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((r) => ({ ...r, from: e.target.value }))} className={cn(inputClass(!validRange), 'w-40')} />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-xs font-medium text-navy-500">
                Đến ngày
              </label>
              <input id="report-to" type="date" value={custom.to} min={custom.from} max={vnToday()} onChange={(e) => setCustom((r) => ({ ...r, to: e.target.value }))} className={cn(inputClass(!validRange), 'w-40')} />
            </div>
          </div>
        )}
        <p className="text-sm text-navy-500" aria-live="polite">
          {shortDate(range.from)} – {shortDate(range.to)}
        </p>
      </div>
      {!validRange && (
        <p role="alert" className="text-sm text-red-600">
          Ngày bắt đầu phải trước ngày kết thúc.
        </p>
      )}

      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-(--radius-card)" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-(--radius-card)" />
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity', isFetching && 'opacity-60')}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Doanh thu" value={formatCurrency(data.totals.revenue)} icon={Banknote} tone="success" />
            <StatCard label="Tổng số đơn" value={data.totals.orders} icon={ClipboardList} />
            <StatCard
              label="Đơn hoàn thành"
              value={data.totals.completed}
              hint={data.totals.orders > 0 ? `${Math.round((data.totals.completed / data.totals.orders) * 100)}% tổng đơn · ${data.totals.cancelled} huỷ/từ chối` : undefined}
              icon={CheckCircle2}
              tone="brand"
            />
            <StatCard label="Giá trị TB / đơn" value={formatCurrency(data.totals.averageOrderValue)} icon={Receipt} />
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Doanh thu theo ngày</h2>
              <button type="button" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable} className="text-sm font-semibold text-brand-600 hover:underline">
                {showTable ? 'Ẩn bảng số liệu' : 'Xem dạng bảng'}
              </button>
            </div>
            {data.totals.orders === 0 ? (
              <EmptyState title="Chưa có đơn hàng trong khoảng thời gian này" />
            ) : (
              <div className="mt-4">
                <Suspense fallback={<Skeleton className="h-72" />}>
                  <RevenueChart series={data.series} />
                </Suspense>
              </div>
            )}
            {showTable && (
              <div className="mt-4 max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Số liệu theo ngày</caption>
                  <thead className="sticky top-0 bg-white text-left text-xs text-navy-500 uppercase">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">Ngày</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Số đơn</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Hoàn thành</th>
                      <th scope="col" className="py-2 text-right font-semibold">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 tabular-nums">
                    {data.series.map((d) => (
                      <tr key={d.date}>
                        <td className="py-2 pr-4">{shortDate(d.date)}</td>
                        <td className="py-2 pr-4 text-right">{d.orders}</td>
                        <td className="py-2 pr-4 text-right">{d.completed}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold">Món bán chạy</h2>
            {data.topItems.length === 0 ? (
              <p className="mt-3 text-sm text-navy-500">Chưa có món nào được bán trong khoảng thời gian này.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-left text-xs text-navy-500 uppercase">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">#</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Món</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Số phần</th>
                      <th scope="col" className="py-2 text-right font-semibold">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 tabular-nums">
                    {data.topItems.map((item, i) => (
                      <tr key={item.menuItemId}>
                        <td className="py-2.5 pr-4 text-navy-400">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium">{item.name}</td>
                        <td className="py-2.5 pr-4 text-right">{item.quantity}</td>
                        <td className="py-2.5 text-right font-semibold">{formatCurrency(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
