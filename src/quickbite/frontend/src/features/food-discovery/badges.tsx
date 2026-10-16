import { Star } from 'lucide-react';
import type { Rating } from '@/types/models';
import { cn } from '@/lib/utils';

/** Trạng thái quầy: Đang nhận đơn / Tạm ngưng nhận đơn / Đã đóng cửa */
export function StallStatusBadge({
  isOpenNow,
  canOrderNow,
  className,
}: {
  isOpenNow: boolean;
  canOrderNow: boolean;
  className?: string;
}) {
  const [label, style] = canOrderNow
    ? ['Đang nhận đơn', 'bg-green-50 text-green-700 ring-green-600/20']
    : isOpenNow
      ? ['Tạm ngưng nhận đơn', 'bg-amber-50 text-amber-700 ring-amber-600/20']
      : ['Đã đóng cửa', 'bg-gray-100 text-gray-600 ring-gray-500/20'];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', style, className)}>
      <span className={cn('size-1.5 rounded-full', canOrderNow ? 'bg-green-500' : isOpenNow ? 'bg-amber-500' : 'bg-gray-400')} aria-hidden />
      {label}
    </span>
  );
}

export function RatingBadge({ rating, className }: { rating: Rating; className?: string }) {
  if (rating.average === null) return <span className={cn('text-xs text-navy-400', className)}>Chưa có đánh giá</span>;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold text-navy-800', className)}>
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
      {rating.average.toFixed(1)}
      <span className="font-normal text-navy-400">({rating.count} đánh giá)</span>
    </span>
  );
}
