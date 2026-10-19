import { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import type { MenuItem } from '@/types/models';
import { cn, formatCurrency } from '@/lib/utils';

export const MAX_ITEM_NOTE = 255;

interface FoodDetailContentProps {
  item: MenuItem;
  /** Gọi khi bấm "Thêm vào giỏ". Không truyền → nút bị vô hiệu hoá. */
  onAddToCart?: (input: { quantity: number; note: string }) => void;
  adding?: boolean;
  /** Lý do người dùng hiện tại không được đặt món (vd: tài khoản chủ quầy) */
  blockedReason?: string;
  onNavigate?: () => void;
  layout?: 'dialog' | 'page';
}

/** Nội dung chi tiết món: dùng chung cho hộp thoại và trang chi tiết */
export function FoodDetailContent({ item, onAddToCart, adding, blockedReason, onNavigate, layout = 'dialog' }: FoodDetailContentProps) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const total = Number(item.price) * quantity;

  const reason = blockedReason
    ? blockedReason
    : !item.isAvailable
    ? 'Món này tạm hết, vui lòng quay lại sau.'
    : !item.canOrder
      ? item.stall.isOpenNow
        ? 'Quầy đang tạm ngưng nhận đơn.'
        : 'Quầy hiện đã đóng cửa. Bạn có thể đặt khi quầy mở cửa.'
      : null;

  return (
    <div className={cn(layout === 'page' && 'grid gap-8 md:grid-cols-2')}>
      <ImageWithFallback
        src={item.imageUrl ?? undefined}
        alt={item.name}
        className={cn('w-full object-cover', layout === 'dialog' ? 'aspect-[16/9]' : 'aspect-square rounded-(--radius-card)', !item.isAvailable && 'grayscale')}
      />

      <div className={cn(layout === 'dialog' && 'p-6')}>
        <p className="text-sm font-semibold text-brand-600">{item.category.name}</p>
        <h3 className={cn('mt-1 font-extrabold', layout === 'dialog' ? 'text-2xl' : 'text-3xl')}>{item.name}</h3>

        <Link
          to={`/quan-an/${item.stall.slug}`}
          onClick={onNavigate}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-brand-600 hover:underline"
        >
          <Store className="size-4" aria-hidden /> {item.stall.name}
        </Link>
        {item.stall.location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-navy-500">
            <MapPin className="size-4" aria-hidden /> {item.stall.location}
          </p>
        )}

        {item.description && <p className="mt-4 leading-relaxed text-navy-600">{item.description}</p>}

        <p className="mt-4 text-2xl font-extrabold text-brand-600">{formatCurrency(item.price)}</p>

        {reason ? (
          <p role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
            {reason}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Số lượng</span>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>
            <div>
              <label htmlFor={`note-${item.id}`} className="mb-1.5 block text-sm font-semibold">
                Ghi chú cho quầy <span className="font-normal text-navy-400">(không bắt buộc)</span>
              </label>
              <textarea
                id={`note-${item.id}`}
                value={note}
                maxLength={MAX_ITEM_NOTE}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Vd: ít cay, không hành..."
                className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-navy-400">
                {note.length}/{MAX_ITEM_NOTE}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={!onAddToCart}
              loading={adding}
              onClick={() => onAddToCart?.({ quantity, note: note.trim() })}
            >
              <ShoppingBag className="size-5" aria-hidden />
              Thêm vào giỏ · {formatCurrency(total)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
