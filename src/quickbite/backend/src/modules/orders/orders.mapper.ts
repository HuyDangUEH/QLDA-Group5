import type { Prisma } from '@prisma/client';
import { allowedNextStatuses } from './order-status.js';

export const orderDetailInclude = {
  stall: { select: { id: true, name: true, slug: true, location: true, phone: true, imageUrl: true } },
  pickupLocation: { select: { id: true, name: true, building: true, description: true } },
  items: { orderBy: { id: 'asc' } },
  statusHistory: { orderBy: { createdAt: 'asc' }, select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true } },
  review: { select: { id: true, rating: true, comment: true, createdAt: true } },
  student: { select: { id: true, fullName: true, phone: true, studentCode: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

const money = (d: Prisma.Decimal) => d.toFixed(0);

/** DTO đơn hàng trả cho client. Tiền là chuỗi số nguyên VND */
export function toOrderDto(order: OrderWithDetail) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: money(order.subtotal),
    serviceFee: money(order.serviceFee),
    discount: money(order.discount),
    total: money(order.total),
    customerNote: order.customerNote,
    pickupTime: order.pickupTime,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    acceptedAt: order.acceptedAt,
    readyAt: order.readyAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    stall: order.stall,
    pickupLocation: order.pickupLocation,
    student: order.student,
    items: order.items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      itemName: i.itemName,
      unitPrice: money(i.unitPrice),
      quantity: i.quantity,
      note: i.note,
      lineTotal: money(i.lineTotal),
    })),
    statusHistory: order.statusHistory,
    review: order.review,
    /** Sinh viên có thể tự huỷ đơn này không */
    canCancel: allowedNextStatuses(order.status, 'STUDENT_OWNER').includes('CANCELLED'),
  };
}

export const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  pickupTime: true,
  createdAt: true,
  stall: { select: { id: true, name: true, slug: true, imageUrl: true } },
  pickupLocation: { select: { id: true, name: true } },
  items: { select: { itemName: true, quantity: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.OrderSelect;

export function toOrderSummary(order: Prisma.OrderGetPayload<{ select: typeof orderSummarySelect }>) {
  return {
    ...order,
    total: money(order.total),
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
  };
}
