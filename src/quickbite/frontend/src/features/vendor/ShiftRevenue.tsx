import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ShiftRevenue as Shift } from '@/types/vendor';
import { formatCurrency } from '@/lib/utils';

/** Doanh thu theo ca: mỗi ca một dòng (khung giờ, số đơn, doanh thu, tỉ trọng), thanh ngang so sánh giữa các ca */
export function ShiftRevenue({ shifts }: { shifts: Shift[] }) {
  const total = shifts.reduce((sum, s) => sum + Number(s.revenue), 0);
  const max = Math.max(...shifts.map((s) => Number(s.revenue)), 0);
  const best = total > 0 ? shifts.reduce((a, b) => (Number(b.revenue) > Number(a.revenue) ? b : a)) : null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Doanh thu theo ca</h2>
        {best && (
          <p className="text-sm text-navy-500">
            Ca doanh thu cao nhất: <span className="font-semibold text-navy-900">{best.label}</span>
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-navy-500">Tính theo giờ đặt đơn. Doanh thu chỉ gồm đơn đã hoàn thành.</p>

      <ul className="mt-4 space-y-3" aria-label="Doanh thu từng ca">
        {shifts.map((s) => {
          const revenue = Number(s.revenue);
          const share = total > 0 ? Math.round((revenue / total) * 100) : 0;
          return (
            <li key={s.key} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr_9rem]">
              <div>
                <p className="font-semibold">{s.label}</p>
                <p className="flex items-center gap-1 text-xs text-navy-500">
                  <Clock className="size-3" aria-hidden /> {s.start} – {s.end}
                </p>
              </div>
              <div className="h-3 rounded-full bg-gray-100" aria-hidden>
                <div className="h-3 rounded-full bg-brand-500 transition-[width]" style={{ width: max > 0 ? `${(revenue / max) * 100}%` : '0%' }} />
              </div>
              <div className="col-span-2 text-sm tabular-nums sm:col-span-1 sm:text-right">
                <span className="font-semibold">{formatCurrency(s.revenue)}</span>
                <span className="text-navy-500">
                  {' '}
                  · {share}% · {s.completed}/{s.orders} đơn
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
