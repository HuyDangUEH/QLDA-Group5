import { Banknote, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentMethod, PaymentStatus } from '@/types/models';

const STYLES: Record<PaymentStatus, string> = {
  UNPAID: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  PAID: 'bg-green-50 text-green-800 ring-green-600/20',
  REFUNDED: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  VOIDED: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

function labelOf(method: PaymentMethod, status: PaymentStatus) {
  if (method === 'VIETQR') {
    if (status === 'UNPAID') return 'Chờ chuyển khoản';
    if (status === 'PAID') return 'Đã chuyển khoản';
  }
  if (status === 'UNPAID') return 'Thu tiền mặt';
  if (status === 'PAID') return 'Đã thu tiền mặt';
  return status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Không thu tiền';
}

/** Nhãn phương thức + trạng thái thanh toán (có icon, không chỉ dựa vào màu) */
export function PaymentBadge({ method, status, className }: { method: PaymentMethod; status: PaymentStatus; className?: string }) {
  const Icon = method === 'VIETQR' ? QrCode : Banknote;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', STYLES[status], className)}>
      <Icon className="size-3.5" aria-hidden /> {labelOf(method, status)}
    </span>
  );
}
