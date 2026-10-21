import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, Clock, MapPin, Phone, ReceiptText, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { ApiError, toApiError } from '@/lib/api-client';
import { orderKeys, ordersService } from '@/services/orders.service';
import { OrderProgress } from '@/features/orders/OrderProgress';
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, isActiveStatus } from '@/features/orders/order-labels';
import type { Order } from '@/types/models';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/utils';
import { OrderReviewCard } from '@/features/reviews/ReviewForm';
import { VietQrPaymentCard } from '@/features/payments/VietQrPaymentCard';
import { PaymentBadge } from '@/features/payments/PaymentBadge';
import { NotFoundPage } from './NotFoundPage';

/** Chi tiết & theo dõi đơn. Khi vừa đặt xong (?moi=1) hiển thị thêm lời xác nhận và hướng dẫn nhận món. */
export function OrderDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const [params] = useSearchParams();
  const justPlaced = params.get('moi') === '1';

  const { data: order, isPending, error, refetch } = useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersService.detail(id),
    enabled: valid,
    // Tự cập nhật: 5 giây khi đang chờ chuyển khoản (để biết ngay khi tiền về), 15 giây khi đơn còn đang xử lý
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.awaitingPayment) return 5_000;
      return isActiveStatus(data.status) ? 15_000 : false;
    },
  });

  if (!valid || (error instanceof ApiError && error.status === 404)) return <NotFoundPage />;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <Link to="/don-hang" className="inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-brand-600">
        <ChevronLeft className="size-4" aria-hidden /> Đơn hàng của tôi
      </Link>

      {isPending ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState message={error.message} onRetry={() => refetch()} />
        </div>
      ) : (
        <OrderDetail order={order} justPlaced={justPlaced} />
      )}
    </section>
  );
}

function OrderDetail({ order, justPlaced }: { order: Order; justPlaced: boolean }) {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const cancel = useMutation({
    mutationFn: () => ordersService.cancel(order.id, reason.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(orderKeys.detail(order.id), updated);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      setCancelOpen(false);
      toast.success('Đã huỷ đơn hàng');
    },
    onError: (e) => {
      toast.error(toApiError(e).message);
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
    },
  });

  const byTransfer = order.paymentMethod === 'VIETQR';
  const paidByTransfer = byTransfer && order.paymentStatus === 'PAID';

  return (
    <>
      {justPlaced && order.status === 'PENDING' && !paidByTransfer && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-green-50 p-5 text-green-900 ring-1 ring-green-200">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-green-600" aria-hidden />
          <div>
            <p className="text-lg font-bold">Đặt món thành công! 🎉</p>
            <p className="mt-1 text-sm">
              {order.awaitingPayment ? (
                <>
                  Vui lòng quét mã QR bên dưới để chuyển khoản. Quầy <strong>{order.stall.name}</strong> sẽ nhận đơn ngay khi nhận được tiền.
                </>
              ) : (
                <>
                  Quầy <strong>{order.stall.name}</strong> sẽ xác nhận đơn trong ít phút. Trang này tự cập nhật trạng thái, bạn không cần tải lại.
                </>
              )}
            </p>
          </div>
        </div>
      )}
      {paidByTransfer && order.status === 'PENDING' && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-green-50 p-5 text-green-900 ring-1 ring-green-200">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-green-600" aria-hidden />
          <div>
            <p className="text-lg font-bold">Thanh toán thành công!</p>
            <p className="mt-1 text-sm">
              Quầy <strong>{order.stall.name}</strong> đã nhận {formatCurrency(order.total)}. Đơn đang chờ quầy xác nhận.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-navy-500">Mã đơn hàng</p>
          <h1 className="font-mono text-3xl font-extrabold tracking-tight">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-navy-500">Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
        {order.awaitingPayment ? (
          <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} className="px-3 py-1 text-sm" />
        ) : (
          <OrderStatusBadge status={order.status} className="px-3 py-1 text-sm" />
        )}
      </div>

      {order.awaitingPayment && order.vietQr?.qrPayload && (
        <div className="mt-6">
          <VietQrPaymentCard
            info={order.vietQr}
            orderNumber={order.orderNumber}
            startedAt={order.createdAt}
            onExpired={() => queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) })}
          />
        </div>
      )}

      <Card className="mt-6 p-6">
        <OrderProgress order={order} />
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
        <OrderReviewCard order={order} />
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ReceiptText className="size-5 text-brand-500" aria-hidden /> Chi tiết đơn
          </h2>
          <ul className="mt-4 divide-y divide-gray-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-semibold">{item.quantity} ×</span> {item.itemName}
                  <span className="block text-xs text-navy-500">{formatCurrency(item.unitPrice)} / phần</span>
                  {item.note && <span className="block text-xs text-navy-500">Ghi chú: {item.note}</span>}
                </span>
                <span className="shrink-0 font-semibold">{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-500">Tạm tính</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            {Number(order.serviceFee) > 0 && (
              <div className="flex justify-between">
                <dt className="text-navy-500">Phí dịch vụ</dt>
                <dd>{formatCurrency(order.serviceFee)}</dd>
              </div>
            )}
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-navy-500">Giảm giá</dt>
                <dd>-{formatCurrency(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base">
              <dt className="font-bold">Tổng cộng</dt>
              <dd className="text-xl font-extrabold text-brand-600">{formatCurrency(order.total)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-navy-500">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</dt>
              <dd className="font-medium">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd>
            </div>
            {paidByTransfer && order.vietQr?.paidAt && (
              <p className="text-right text-xs text-navy-500">Nhận tiền lúc {formatDateTime(order.vietQr.paidAt)}</p>
            )}
          </dl>
          {order.customerNote && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-navy-600">Ghi chú của bạn: {order.customerNote}</p>}
        </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-6 text-sm">
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <MapPin className="size-4 text-brand-500" aria-hidden /> Điểm nhận món
              </p>
              <p className="mt-1 font-medium">{order.pickupLocation.name}</p>
              {order.pickupLocation.description && <p className="text-navy-500">{order.pickupLocation.description}</p>}
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <Clock className="size-4 text-brand-500" aria-hidden /> Giờ nhận
              </p>
              <p className="mt-1">{order.pickupTime ? `Khoảng ${formatTime(order.pickupTime)}` : 'Sớm nhất có thể'}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <Store className="size-4 text-brand-500" aria-hidden /> Quầy
              </p>
              <Link to={`/quan-an/${order.stall.slug}`} className="mt-1 block font-medium hover:text-brand-600">
                {order.stall.name}
              </Link>
              {order.stall.phone && (
                <a href={`tel:${order.stall.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-navy-500 hover:text-brand-600">
                  <Phone className="size-3.5" aria-hidden /> {order.stall.phone}
                </a>
              )}
            </div>
          </Card>

          {isActiveStatus(order.status) && (
            <Card className="bg-navy-900 p-6 text-sm text-navy-100">
              <p className="font-bold text-white">Hướng dẫn nhận món</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Chờ trạng thái chuyển sang “Sẵn sàng để nhận”.</li>
                <li>Đến {order.pickupLocation.name} và đọc mã đơn <strong className="font-mono text-white">{order.orderNumber}</strong>.</li>
                <li>
                  {paidByTransfer
                    ? 'Bạn đã thanh toán chuyển khoản, không cần trả thêm tiền.'
                    : byTransfer
                      ? `Chuyển khoản ${formatCurrency(order.total)} theo mã QR ở trên để quầy nhận đơn.`
                      : `Thanh toán ${formatCurrency(order.total)} bằng tiền mặt khi nhận.`}
                </li>
              </ol>
            </Card>
          )}

          {order.canCancel && (
            <Button variant="outline" className="w-full text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
              Huỷ đơn hàng
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title={`Huỷ đơn ${order.orderNumber}?`}
        description="Bạn chỉ huỷ được khi quầy chưa xác nhận đơn. Thao tác này không thể hoàn tác."
        confirmLabel="Huỷ đơn"
        cancelLabel="Không huỷ"
        tone="danger"
        loading={cancel.isPending}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate()}
      >
        <label htmlFor="cancel-reason" className="mb-1.5 block text-sm font-medium">
          Lý do <span className="font-normal text-navy-400">(không bắt buộc)</span>
        </label>
        <input
          id="cancel-reason"
          value={reason}
          maxLength={255}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Vd: Đặt nhầm món"
          className="h-11 w-full rounded-xl border border-gray-300 px-3.5 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
        />
      </ConfirmDialog>
    </>
  );
}
