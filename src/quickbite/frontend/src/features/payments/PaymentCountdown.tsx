import { Timer } from 'lucide-react';
import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';
import { formatCountdown, isRunningOut } from './countdown';

/** Nhãn nhỏ "còn mm:ss" cho đơn chuyển khoản đang chờ tiền (dùng ở thẻ đơn của quầy) */
export function PaymentCountdown({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const now = useNow(1000);
  const remaining = new Date(expiresAt).getTime() - now;
  const expired = remaining <= 0;
  return (
    <span
      role="timer"
      aria-label={expired ? 'Hết hạn chuyển khoản' : `Còn ${formatCountdown(remaining)} để sinh viên chuyển khoản`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-bold tabular-nums ring-1 ring-inset',
        expired ? 'bg-red-50 text-red-700 ring-red-600/20' : isRunningOut(remaining) ? 'bg-amber-50 text-amber-800 ring-amber-600/20' : 'bg-gray-50 text-navy-700 ring-gray-500/20',
        className,
      )}
    >
      <Timer className="size-3.5" aria-hidden />
      {expired ? 'Hết hạn' : `còn ${formatCountdown(remaining)}`}
    </span>
  );
}
