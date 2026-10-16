import { Flame, Store } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MenuItem } from '@/types/models';
import { cn, formatCurrency } from '@/lib/utils';

interface FoodCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  /** Ẩn tên quầy (dùng trong trang chi tiết quầy) */
  hideStall?: boolean;
}

/** Thẻ món ăn. Cả thẻ là một nút để mở chi tiết món. */
export function FoodCard({ item, onSelect, hideStall }: FoodCardProps) {
  const unavailable = !item.isAvailable;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group flex h-full w-full flex-col overflow-hidden rounded-(--radius-card) border border-gray-100 bg-white text-left shadow-(--shadow-card) transition hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
      aria-label={`${item.name}, ${formatCurrency(item.price)}${unavailable ? ', hết món' : ''}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <ImageWithFallback
          src={item.imageUrl ?? undefined}
          alt=""
          className={cn('size-full object-cover transition duration-300 group-hover:scale-105', unavailable && 'grayscale')}
        />
        {unavailable ? (
          <span className="absolute top-3 left-3 rounded-full bg-navy-900/85 px-2.5 py-1 text-xs font-semibold text-white">Hết món</span>
        ) : (
          item.soldCount >= 5 && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-600 shadow-sm">
              <Flame className="size-3.5" aria-hidden /> Đã bán {item.soldCount}
            </span>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-medium text-brand-600">{item.category.name}</p>
        <h3 className="line-clamp-2 font-bold text-navy-900">{item.name}</h3>
        {!hideStall && (
          <p className="flex items-center gap-1 text-sm text-navy-500">
            <Store className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{item.stall.name}</span>
          </p>
        )}
        <p className={cn('mt-auto pt-2 text-lg font-extrabold', unavailable ? 'text-navy-400' : 'text-navy-900')}>
          {formatCurrency(item.price)}
        </p>
      </div>
    </button>
  );
}

export function FoodCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-gray-100 bg-white">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-3 h-6 w-24" />
      </div>
    </div>
  );
}

export function FoodGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Đang tải món ăn">
      {Array.from({ length: count }, (_, i) => (
        <FoodCardSkeleton key={i} />
      ))}
    </div>
  );
}
