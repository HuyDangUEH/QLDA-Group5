import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUpdateOrderStatus, type OrderActionMode } from './use-update-order-status';
import type { OrderStatus } from '@/types/models';

/** Nhãn nút cho từng bước chuyển trạng thái (góc nhìn của quầy) */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  ACCEPTED: 'Nhận đơn',
  PREPARING: 'Bắt đầu làm',
  READY_FOR_PICKUP: 'Món đã xong',
  COMPLETED: 'Đã giao & thu tiền',
  REJECTED: 'Từ chối',
  CANCELLED: 'Huỷ đơn',
};

/** Các bước cần nhập lý do */
const NEEDS_REASON: OrderStatus[] = ['REJECTED', 'CANCELLED'];

/** Các nút xử lý đơn theo trạng thái tiếp theo hợp lệ (do server tính) */
export function OrderActions({
  stallId,
  orderId,
  orderNumber,
  nextStatuses,
  size = 'sm',
  mode = 'vendor',
}: {
  stallId: number;
  orderId: number;
  orderNumber: string;
  nextStatuses: OrderStatus[];
  size?: 'sm' | 'md';
  mode?: OrderActionMode;
}) {
  const update = useUpdateOrderStatus(stallId, mode);
  const [reasonFor, setReasonFor] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  if (nextStatuses.length === 0) return null;

  const forward = nextStatuses.filter((s) => !NEEDS_REASON.includes(s));
  const negative = nextStatuses.filter((s) => NEEDS_REASON.includes(s));
  const busy = update.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((status) => (
        <Button
          key={status}
          size={size}
          loading={busy && update.variables?.status === status}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            update.mutate({ orderId, status });
          }}
        >
          {ACTION_LABELS[status]}
        </Button>
      ))}
      {negative.map((status) => (
        <Button
          key={status}
          size={size}
          variant="outline"
          className="text-red-600 hover:bg-red-50"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setReason('');
            setReasonError('');
            setReasonFor(status);
          }}
        >
          {ACTION_LABELS[status]}
        </Button>
      ))}

      <ConfirmDialog
        open={reasonFor !== null}
        title={`${reasonFor ? ACTION_LABELS[reasonFor] : ''} đơn ${orderNumber}?`}
        description="Sinh viên sẽ nhận được thông báo kèm lý do bạn nhập."
        confirmLabel={reasonFor ? ACTION_LABELS[reasonFor] : 'Xác nhận'}
        cancelLabel="Quay lại"
        tone="danger"
        loading={busy}
        onCancel={() => setReasonFor(null)}
        onConfirm={() => {
          if (!reason.trim()) {
            setReasonError('Vui lòng nhập lý do');
            return;
          }
          update.mutate({ orderId, status: reasonFor!, reason: reason.trim() }, { onSettled: () => setReasonFor(null) });
        }}
      >
        <label htmlFor={`reason-${orderId}`} className="mb-1.5 block text-sm font-medium">
          Lý do <span className="text-brand-600">*</span>
        </label>
        <input
          id={`reason-${orderId}`}
          value={reason}
          maxLength={255}
          onChange={(e) => {
            setReason(e.target.value);
            setReasonError('');
          }}
          placeholder="Vd: Hết nguyên liệu, quầy quá tải..."
          aria-invalid={reasonError ? true : undefined}
          aria-describedby={reasonError ? `reason-${orderId}-error` : undefined}
          className="h-11 w-full rounded-xl border border-gray-300 px-3.5 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
        />
        {reasonError && (
          <p id={`reason-${orderId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
            {reasonError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
