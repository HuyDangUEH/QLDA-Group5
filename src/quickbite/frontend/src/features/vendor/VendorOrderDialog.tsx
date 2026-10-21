import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner, ErrorState } from '@/components/ui/States';
import { OrderProgress } from '@/features/orders/OrderProgress';
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge';
import { ORDER_STATUS_LABELS } from '@/features/orders/order-labels';
import { PaymentBadge } from '@/features/payments/PaymentBadge';
import { PaymentCountdown } from '@/features/payments/PaymentCountdown';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/utils';
import { adminKeys, adminService } from '@/services/admin.service';
import { OrderActions } from './order-actions';
import type { OrderActionMode } from './use-update-order-status';

/** Chi tiết đơn cho quầy: món, ghi chú, liên hệ sinh viên, lịch sử trạng thái, nút xử lý */
export function VendorOrderDialog({
  stallId,
  orderId,
  onClose,
  mode = 'vendor',
}: {
  stallId: number;
  orderId: number | null;
  onClose: () => void;
  mode?: OrderActionMode;
}) {
  const { data: order, isPending, error, refetch } = useQuery({
    queryKey: mode === 'admin' ? adminKeys.order(orderId ?? 0) : vendorKeys.order(stallId, orderId ?? 0),
    queryFn: () => (mode === 'admin' ? adminService.order(orderId!) : vendorService.order(stallId, orderId!)),
    enabled: orderId !== null,
  });

  return (
    <Dialog open={orderId !== null} onClose={onClose} title={order ? `Đơn ${order.orderNumber}` : 'Chi tiết đơn'}>
      <div className="space-y-5 p-6 pt-4">
        {isPending ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-navy-500">
              <OrderStatusBadge status={order.status} />
              Đặt lúc {formatDateTime(order.createdAt)}
            </div>
            <OrderProgress order={order} />

            <div className="grid gap-4 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold">Sinh viên</p>
                <p>{order.student.fullName}</p>
                {order.student.studentCode && <p className="text-navy-500">MSSV: {order.student.studentCode}</p>}
                {order.student.phone && (
                  <a href={`tel:${order.student.phone}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                    <Phone className="size-3.5" aria-hidden /> {order.student.phone}
                  </a>
                )}
              </div>
              <div>
                <p className="font-semibold">Nhận món</p>
                <p>{order.pickupLocation.name}</p>
                <p className="text-navy-500">{order.pickupTime ? `Lúc ${formatTime(order.pickupTime)}` : 'Sớm nhất có thể'}</p>
              </div>
            </div>

            <ul className="divide-y divide-gray-100 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-bold">{item.quantity} ×</span> {item.itemName}
                    {item.note && <span className="block text-xs font-medium text-amber-700">Ghi chú: {item.note}</span>}
                  </span>
                  <span className="shrink-0">{formatCurrency(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold">Tổng</span>
                <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
                {order.vietQr?.paidAt && (
                  <span className="text-xs text-navy-500">
                    {order.vietQr.confirmedBy === 'SEPAY' ? 'Ngân hàng báo' : 'Quầy xác nhận'} lúc {formatTime(order.vietQr.paidAt)}
                  </span>
                )}
              </span>
              <span className="text-lg font-extrabold text-brand-600">{formatCurrency(order.total)}</span>
            </div>
            {order.customerNote && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ghi chú của sinh viên: {order.customerNote}</p>}

            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-navy-600">Lịch sử trạng thái ({order.statusHistory.length})</summary>
              <ol className="mt-2 space-y-1 border-l-2 border-gray-200 pl-4">
                {order.statusHistory.map((h) => (
                  <li key={h.id}>
                    <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus]}</span>
                    <span className="text-navy-500"> · {formatDateTime(h.createdAt)}</span>
                    {h.note && <span className="block text-xs text-navy-500">{h.note}</span>}
                  </li>
                ))}
              </ol>
            </details>

            {order.awaitingPayment && order.vietQr && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Đang chờ sinh viên chuyển khoản <strong>{formatCurrency(order.vietQr.amount)}</strong> vào {order.vietQr.bankShortName} {order.vietQr.accountNo}, nội dung{' '}
                <strong className="font-mono">{order.vietQr.content}</strong>. Chỉ nhận đơn sau khi đã nhận được tiền.
                {order.vietQr.expiresAt && (
                  <span className="mt-2 flex items-center gap-2">
                    Hết hạn sau <PaymentCountdown expiresAt={order.vietQr.expiresAt} />
                  </span>
                )}
              </p>
            )}

            <OrderActions
              stallId={stallId}
              orderId={order.id}
              orderNumber={order.orderNumber}
              nextStatuses={order.nextStatuses}
              size="md"
              mode={mode}
              payment={{ method: order.paymentMethod, awaitingPayment: order.awaitingPayment, total: order.total }}
            />
          </>
        )}
      </div>
    </Dialog>
  );
}
