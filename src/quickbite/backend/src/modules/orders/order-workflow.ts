import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import { ORDER_STATUS_LABELS, allowedNextStatuses, findTransition, type OrderActor } from './order-status.js';
import { orderDetailInclude, toOrderDto } from './orders.mapper.js';

/** Thông báo gửi sinh viên khi đơn đổi trạng thái */
const STUDENT_MESSAGES: Partial<Record<OrderStatus, (stall: string, reason?: string) => string>> = {
  ACCEPTED: (s) => `${s} đã nhận đơn của bạn.`,
  PREPARING: (s) => `${s} đang chuẩn bị món cho bạn.`,
  READY_FOR_PICKUP: (s) => `Món của bạn đã sẵn sàng! Hãy đến điểm nhận để lấy món tại ${s}.`,
  COMPLETED: (s) => `Đơn tại ${s} đã hoàn thành. Cảm ơn bạn! Hãy để lại đánh giá nhé.`,
  REJECTED: (s, r) => `${s} không thể nhận đơn của bạn${r ? `: ${r}` : '.'}`,
  CANCELLED: (s, r) => `Đơn của bạn tại ${s} đã bị huỷ${r ? `: ${r}` : '.'}`,
};

interface TransitionInput {
  orderId: number;
  /** Giới hạn trong một quầy (bắt buộc với nhân viên quầy) */
  stallId?: number;
  to: OrderStatus;
  actor: OrderActor;
  userId: number;
  reason?: string;
}

/**
 * Chuyển trạng thái đơn theo máy trạng thái, trong một transaction:
 * - Kiểm tra chuyển trạng thái hợp lệ với vai trò thực hiện
 * - Cập nhật có điều kiện (WHERE status = trạng thái cũ) để hai người bấm cùng lúc không làm hỏng đơn
 * - Ghi mốc thời gian, cập nhật thanh toán, số lượng đã bán, lịch sử và thông báo cho sinh viên
 */
export async function transitionOrder({ orderId, stallId, to, actor, userId, reason }: TransitionInput) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(stallId !== undefined && { stallId }) },
    include: { stall: { select: { name: true } }, items: { select: { menuItemId: true, quantity: true } } },
  });
  if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');

  const transition = findTransition(order.status, to, actor);
  if (!transition) {
    throw AppError.unprocessable(
      `Không thể chuyển đơn từ "${ORDER_STATUS_LABELS[order.status]}" sang "${ORDER_STATUS_LABELS[to]}"`,
      { allowed: allowedNextStatuses(order.status, actor) },
    );
  }
  const trimmedReason = reason?.trim() || undefined;
  if (transition.requiresReason && !trimmedReason) {
    throw AppError.badRequest('Vui lòng nhập lý do', [{ field: 'reason', message: 'Vui lòng nhập lý do' }]);
  }

  const now = new Date();
  const data: Prisma.OrderUpdateManyMutationInput = { status: to };
  if (to === 'ACCEPTED') data.acceptedAt = now;
  if (to === 'READY_FOR_PICKUP') data.readyAt = now;
  if (to === 'COMPLETED') {
    // Thanh toán tiền mặt: quầy xác nhận đã thu tiền khi giao món
    data.completedAt = now;
    data.paymentStatus = 'PAID';
  }
  if (to === 'CANCELLED' || to === 'REJECTED') {
    data.cancelledAt = now;
    data.cancelReason = trimmedReason ?? (to === 'REJECTED' ? 'Quầy từ chối đơn' : 'Đơn bị huỷ');
    if (order.paymentStatus === 'UNPAID') data.paymentStatus = 'VOIDED';
  }

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data });
    if (count === 0) throw AppError.conflict('Trạng thái đơn vừa được người khác thay đổi, vui lòng tải lại');

    if (to === 'COMPLETED') {
      await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: 'PAID', paidAt: now, confirmedById: userId } });
      // Cập nhật số phần đã bán để sắp xếp "bán chạy"
      for (const item of order.items) {
        await tx.menuItem.update({ where: { id: item.menuItemId }, data: { soldCount: { increment: item.quantity } } });
      }
    }
    if (data.paymentStatus === 'VOIDED') {
      await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: 'VOIDED' } });
    }

    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: order.status, toStatus: to, changedById: userId, note: trimmedReason ?? null },
    });

    const message = STUDENT_MESSAGES[to]?.(order.stall.name, trimmedReason);
    if (message) {
      await tx.notification.create({
        data: {
          userId: order.studentId,
          orderId: order.id,
          type: 'ORDER_STATUS',
          title: `Đơn ${order.orderNumber}: ${ORDER_STATUS_LABELS[to]}`,
          message,
        },
      });
    }
  });

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
  return { ...toOrderDto(updated), nextStatuses: allowedNextStatuses(updated.status, actor) };
}
