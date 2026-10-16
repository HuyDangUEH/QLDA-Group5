import type { OrderStatus } from '@/types/models';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from './order-labels';

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', ORDER_STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
