import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { buttonClass } from '@/components/ui/styles';
import { toApiError } from '@/lib/api-client';
import { cn, formatCurrency } from '@/lib/utils';
import { useCart, useRemoveCartItem } from './hooks';

/** Số dòng tối đa hiện trong mini cart; còn lại xem ở trang giỏ hàng */
const MAX_LINES = 4;

/** Nút giỏ hàng trên Header của sinh viên: bấm để xem nhanh giỏ mà không rời trang */
export function MiniCart() {
  const { data: cart } = useCart();
  const remove = useRemoveCartItem();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = cart?.itemCount ?? 0;
  const lines = cart?.items ?? [];
  const hidden = lines.length - MAX_LINES;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Giỏ hàng, ${count} món` : 'Giỏ hàng'}
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-navy-700 hover:bg-gray-100"
      >
        <ShoppingBag className="size-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white ring-2 ring-white" aria-hidden>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Xem nhanh giỏ hàng"
          // Điện thoại: trải ngang màn hình ngay dưới Header (icon giỏ không nằm sát mép phải nên không canh theo icon được)
          className="fixed inset-x-4 top-16 rounded-xl border border-gray-100 bg-white p-4 shadow-(--shadow-card-hover) sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[22rem]"
        >
          {!cart ? (
            <p className="py-6 text-center text-sm text-navy-500">Đang tải giỏ hàng...</p>
          ) : lines.length === 0 ? (
            <div className="py-4 text-center">
              <p className="font-semibold">Giỏ hàng đang trống</p>
              <p className="mt-1 text-sm text-navy-500">Chọn món bạn thích để đặt trước nhé!</p>
              <Link to="/mon-an" className={buttonClass({ size: 'sm', className: 'mt-4' })} onClick={close}>
                Khám phá món ăn
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 pb-3">
                <p className="truncate text-sm">
                  Đặt tại <span className="font-semibold">{cart.stall?.name}</span>
                </p>
                <span className="shrink-0 text-xs text-navy-500">{count} phần</span>
              </div>

              <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                {lines.slice(0, MAX_LINES).map((line) => (
                  <li key={line.id} className="flex gap-3 py-3">
                    <ImageWithFallback
                      src={line.menuItem.imageUrl ?? undefined}
                      alt=""
                      className={cn('size-12 shrink-0 rounded-lg object-cover', line.issue && 'grayscale')}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.menuItem.name}</p>
                      <p className="text-xs text-navy-500">
                        {line.quantity} × {formatCurrency(line.menuItem.price)}
                      </p>
                      {line.issue && <p className="mt-0.5 text-xs font-medium text-red-600">{line.issue}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{formatCurrency(line.lineTotal)}</span>
                      <button
                        type="button"
                        aria-label={`Xoá ${line.menuItem.name}`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(line.id, { onError: (e) => toast.error(toApiError(e).message) })}
                        className="rounded-md p-0.5 text-navy-400 hover:bg-gray-100 hover:text-red-600"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {hidden > 0 && <p className="pb-2 text-xs text-navy-500">và {hidden} món khác trong giỏ</p>}

              {cart.stallIssue && (
                <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden /> {cart.stallIssue}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm text-navy-600">Tạm tính</span>
                <span className="text-lg font-bold text-brand-600">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/gio-hang" className={buttonClass({ variant: 'outline', size: 'sm' })} onClick={close}>
                  Xem giỏ hàng
                </Link>
                {cart.canCheckout ? (
                  <Link to="/thanh-toan" className={buttonClass({ size: 'sm' })} onClick={close}>
                    Thanh toán
                  </Link>
                ) : (
                  <button type="button" disabled className={buttonClass({ size: 'sm' })} title="Giỏ hàng có món hoặc quầy chưa đặt được">
                    Thanh toán
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
