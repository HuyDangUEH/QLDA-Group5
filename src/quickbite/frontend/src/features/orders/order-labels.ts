import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/models';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ quầy xác nhận',
  ACCEPTED: 'Quầy đã nhận đơn',
  PREPARING: 'Đang chuẩn bị',
  READY_FOR_PICKUP: 'Sẵn sàng để nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã huỷ',
  REJECTED: 'Bị từ chối',
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  ACCEPTED: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  PREPARING: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20',
  READY_FOR_PICKUP: 'bg-green-50 text-green-800 ring-green-600/30',
  COMPLETED: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
  VOIDED: 'Không thu tiền',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH_ON_PICKUP: 'Tiền mặt khi nhận món',
};

/** Các bước chính hiển thị trên thanh tiến trình */
export const ORDER_STEPS: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];

export const isActiveStatus = (s: OrderStatus) => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(s);
