import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle, ArrowRight, MapPin, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { buttonClass } from '@/components/ui/styles';
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart/hooks';
import { StallStatusBadge } from '@/features/food-discovery/badges';
import { toApiError } from '@/lib/api-client';
import type { CartLine } from '@/types/models';
import { cn, formatCurrency } from '@/lib/utils';

export function CartPage() {
  const { data: cart, isPending, error, refetch } = useCart();
  const clear = useClearCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

  if (isPending) return <Spinner label="Đang tải giỏ hàng..." />;
  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    );

  if (cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="size-7" aria-hidden />}
          title="Giỏ hàng đang trống"
          description="Khám phá thực đơn các quầy trong trường và chọn món bạn thích nhé!"
          action={
            <Link to="/mon-an" className={buttonClass()}>
              Khám phá món ăn
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <h1 className="text-3xl font-extrabold">Giỏ hàng</h1>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {cart.stall && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs text-navy-500">Đặt món tại</p>
                <Link to={`/quan-an/${cart.stall.slug}`} className="text-lg font-bold hover:text-brand-600">
                  {cart.stall.name}
                </Link>
                <p className="flex items-center gap-1 text-sm text-navy-500">
                  <MapPin className="size-3.5" aria-hidden /> {cart.stall.location}
                </p>
              </div>
              <StallStatusBadge isOpenNow={cart.stall.isOpenNow} canOrderNow={cart.stall.canOrderNow} />
            </Card>
          )}

          {cart.stallIssue && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> {cart.stallIssue}. Bạn chưa thể đặt đơn lúc này.
            </p>
          )}

          <Card className="divide-y divide-gray-100">
            {cart.items.map((line) => (
              <CartLineRow key={line.id} line={line} />
            ))}
          </Card>

          <div className="flex justify-between">
            <Link to={cart.stall ? `/quan-an/${cart.stall.slug}` : '/mon-an'} className="text-sm font-semibold text-brand-600 hover:underline">
              + Thêm món khác
            </Link>
            <button type="button" onClick={() => setConfirmClear(true)} className="text-sm font-medium text-navy-500 hover:text-red-600">
              Xoá toàn bộ giỏ
            </button>
          </div>
        </div>

        <Card className="p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Tóm tắt</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-500">Tạm tính ({cart.itemCount} phần)</dt>
              <dd className="font-semibold">{formatCurrency(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy-500">Phí dịch vụ</dt>
              <dd className="font-semibold">Miễn phí</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
              <dt className="font-bold">Tổng cộng</dt>
              <dd className="text-xl font-extrabold text-brand-600">{formatCurrency(cart.subtotal)}</dd>
            </div>
          </dl>
          <Button size="lg" className="mt-6 w-full" disabled={!cart.canCheckout} onClick={() => navigate('/thanh-toan')}>
            Tiến hành đặt món <ArrowRight className="size-5" aria-hidden />
          </Button>
          {!cart.canCheckout && <p className="mt-2 text-center text-xs text-navy-500">Vui lòng xử lý các cảnh báo trong giỏ để tiếp tục.</p>}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Xoá toàn bộ giỏ hàng?"
        description="Tất cả món trong giỏ sẽ bị xoá."
        confirmLabel="Xoá giỏ"
        tone="danger"
        loading={clear.isPending}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => {
              setConfirmClear(false);
              toast.success('Đã xoá giỏ hàng');
            },
            onError: (e) => toast.error(toApiError(e).message),
          })
        }
      />
    </section>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const [note, setNote] = useState(line.note ?? '');
  const busy = update.isPending || remove.isPending;

  const onError = (e: unknown) => toast.error(toApiError(e).message);

  const saveNote = () => {
    const trimmed = note.trim();
    if (trimmed === (line.note ?? '')) return;
    update.mutate({ id: line.id, note: trimmed || null }, { onSuccess: () => toast.success('Đã lưu ghi chú'), onError });
  };

  return (
    <div className={cn('flex gap-4 p-4 transition-opacity', busy && 'opacity-60')}>
      <ImageWithFallback src={line.menuItem.imageUrl ?? undefined} alt="" className="size-20 shrink-0 rounded-xl object-cover sm:size-24" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold">{line.menuItem.name}</h3>
            <p className="text-sm text-navy-500">{formatCurrency(line.menuItem.price)} / phần</p>
          </div>
          <p className="shrink-0 font-bold">{formatCurrency(line.lineTotal)}</p>
        </div>

        {line.issue && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertTriangle className="size-4 shrink-0" aria-hidden /> {line.issue}
          </p>
        )}

        <label htmlFor={`cart-note-${line.id}`} className="sr-only">
          Ghi chú cho {line.menuItem.name}
        </label>
        <input
          id={`cart-note-${line.id}`}
          value={note}
          maxLength={255}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Thêm ghi chú (vd: ít cay)"
          className="mt-2 w-full rounded-lg border border-transparent bg-gray-50 px-2.5 py-1.5 text-sm placeholder:text-gray-400 hover:border-gray-200 focus:border-brand-300 focus:bg-white focus:outline-none"
        />

        <div className="mt-3 flex items-center justify-between">
          <QuantitySelector
            size="sm"
            value={line.quantity}
            disabled={busy || !!line.issue}
            label={`Số lượng ${line.menuItem.name}`}
            onChange={(quantity) => update.mutate({ id: line.id, quantity }, { onError })}
          />
          <button
            type="button"
            onClick={() => remove.mutate(line.id, { onError })}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-navy-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`Xoá ${line.menuItem.name} khỏi giỏ`}
          >
            <Trash2 className="size-4" aria-hidden /> Xoá
          </button>
        </div>
      </div>
    </div>
  );
}
