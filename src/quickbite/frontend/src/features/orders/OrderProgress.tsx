import { Check, ChefHat, ClipboardCheck, Clock, PackageCheck, XCircle } from 'lucide-react';
import type { Order } from '@/types/models';
import { cn, formatDateTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STEPS } from './order-labels';

const STEP_ICONS = [Clock, ClipboardCheck, ChefHat, PackageCheck, Check];

/** Thanh tiến trình đơn hàng + mốc thời gian từ lịch sử trạng thái */
export function OrderProgress({ order }: { order: Order }) {
  const ended = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const reached = new Set(order.statusHistory.map((h) => h.toStatus));
  const timeOf = (s: string) => order.statusHistory.find((h) => h.toStatus === s)?.createdAt;
  const currentIndex = ORDER_STEPS.indexOf(order.status);

  if (ended) {
    const at = timeOf(order.status);
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800">
        <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">
            {ORDER_STATUS_LABELS[order.status]}
            {at && <span className="font-normal"> lúc {formatDateTime(at)}</span>}
          </p>
          {order.cancelReason && <p className="mt-0.5 text-sm">Lý do: {order.cancelReason}</p>}
        </div>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Tiến trình đơn hàng">
      {ORDER_STEPS.map((step, i) => {
        const Icon = STEP_ICONS[i]!;
        const done = reached.has(step) || i <= currentIndex;
        const current = i === currentIndex;
        const at = timeOf(step);
        return (
          <li key={step} className="relative flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
            {i > 0 && (
              <span className={cn('absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2', done ? 'bg-brand-500' : 'bg-gray-200')} aria-hidden />
            )}
            <span
              className={cn(
                'relative z-10 flex size-10 items-center justify-center rounded-full border-2 transition',
                done ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-200 bg-white text-gray-400',
                current && 'ring-4 ring-brand-100',
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span className={cn('mt-2 text-[11px] leading-tight font-semibold sm:text-xs', done ? 'text-navy-900' : 'text-navy-400')}>
              {ORDER_STATUS_LABELS[step]}
            </span>
            {at && <span className="mt-0.5 hidden text-[11px] text-navy-400 sm:block">{formatDateTime(at).split(' ')[0]}</span>}
            <span className="sr-only">{done ? 'đã xong' : 'chưa tới'}</span>
          </li>
        );
      })}
    </ol>
  );
}
