import type { FoodStall, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/app-error.js';
import { extractTransferContent } from './vietqr.js';

type Tx = Prisma.TransactionClient;

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;

/** Số phút chờ chuyển khoản chủ quầy được chọn (quá hạn chưa có tiền thì đơn tự huỷ) */
export const PAYMENT_TIMEOUT_MIN = 5;
export const PAYMENT_TIMEOUT_MAX = 60;

/** Quầy đã cài đủ tài khoản nhận chuyển khoản chưa */
export const hasBankAccount = (stall: Pick<FoodStall, 'bankBin' | 'bankAccountNo' | 'bankAccountName'>) =>
  Boolean(stall.bankBin && stall.bankAccountNo && stall.bankAccountName);

/** Dữ liệu webhook SePay gửi khi tài khoản có biến động số dư (https://docs.sepay.vn) */
export const sepayWebhookSchema = z.object({
  id: z.coerce.number().int(),
  gateway: z.string().nullish(),
  transactionDate: z.string().nullish(),
  accountNumber: z.string().nullish(),
  subAccount: z.string().nullish(),
  /** Mã thanh toán SePay tự nhận diện (nếu đã cấu hình), ưu tiên hơn nội dung */
  code: z.string().nullish(),
  content: z.string().default(''),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.coerce.number().nonnegative(),
  referenceCode: z.string().nullish(),
  description: z.string().nullish(),
});
export type SepayWebhook = z.infer<typeof sepayWebhookSchema>;

const paymentWithOrder = {
  order: { select: { id: true, orderNumber: true, status: true, studentId: true, stallId: true, stall: { select: { name: true } } } },
} satisfies Prisma.PaymentInclude;
type PaymentWithOrder = Prisma.PaymentGetPayload<{ include: typeof paymentWithOrder }>;

/**
 * Đánh dấu đơn chuyển khoản đã nhận tiền (trong transaction).
 * Cập nhật có điều kiện status UNPAID/VOIDED → chạy lặp lại (webhook gửi lại) cũng chỉ ghi một lần.
 * Trả về false nếu đã được xác nhận trước đó.
 */
async function markTransferPaid(
  tx: Tx,
  payment: PaymentWithOrder,
  source: { provider: 'SEPAY' | 'MANUAL'; providerRef?: string; confirmedById?: number },
): Promise<boolean> {
  const now = new Date();
  const { count } = await tx.payment.updateMany({
    where: { id: payment.id, status: { in: ['UNPAID', 'VOIDED'] } },
    data: { status: 'PAID', paidAt: now, provider: source.provider, providerRef: source.providerRef ?? null, confirmedById: source.confirmedById ?? null },
  });
  if (count === 0) return false;
  await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } });

  const { order } = payment;
  const amount = vnd(payment.amount.toNumber());
  const orderStillOpen = order.status === 'PENDING';
  const staff = await tx.vendorMembership.findMany({ where: { stallId: order.stallId }, select: { userId: true } });

  await tx.notification.createMany({
    data: [
      {
        userId: order.studentId,
        orderId: order.id,
        type: 'ORDER_STATUS' as const,
        title: `Đã nhận thanh toán đơn ${order.orderNumber}`,
        message: orderStillOpen
          ? `${order.stall.name} đã nhận ${amount}. Đơn đang chờ quầy xác nhận.`
          : `${order.stall.name} đã nhận ${amount} nhưng đơn đã bị huỷ. Quầy sẽ liên hệ hoàn tiền cho bạn.`,
      },
      ...staff.map((s) => ({
        userId: s.userId,
        orderId: order.id,
        type: 'ORDER_STATUS' as const,
        title: orderStillOpen ? `Đơn ${order.orderNumber} đã thanh toán` : `Cần hoàn tiền đơn ${order.orderNumber}`,
        message: orderStillOpen
          ? `Đã nhận chuyển khoản ${amount}. Vui lòng nhận đơn.`
          : `Đơn đã huỷ nhưng vừa nhận chuyển khoản ${amount}. Vui lòng hoàn tiền cho sinh viên.`,
      })),
    ],
  });
  return true;
}

export type WebhookResult = { matched: boolean; reason?: string; orderNumber?: string };

export const paymentsService = {
  /**
   * Xử lý webhook SePay: tìm đơn theo nội dung chuyển khoản, kiểm tra số tiền & tài khoản nhận,
   * rồi đánh dấu đã thanh toán. Giao dịch không khớp vẫn trả 200 để SePay không gửi lại mãi.
   */
  async handleSepayWebhook(input: SepayWebhook): Promise<WebhookResult> {
    if (input.transferType !== 'in') return { matched: false, reason: 'NOT_INCOMING' };

    const content = extractTransferContent(input.code ?? '') ?? extractTransferContent(input.content) ?? extractTransferContent(input.description ?? '');
    if (!content) return { matched: false, reason: 'NO_ORDER_CODE' };

    const payment = await prisma.payment.findUnique({ where: { transferContent: content }, include: paymentWithOrder });
    if (!payment || payment.method !== 'VIETQR') return { matched: false, reason: 'ORDER_NOT_FOUND' };

    const log = { sepayId: input.id, orderNumber: payment.order.orderNumber, amount: input.transferAmount };
    // Tiền phải vào đúng tài khoản của quầy (đã chụp lại lúc đặt)
    const receivers = [input.accountNumber, input.subAccount].filter(Boolean);
    if (receivers.length > 0 && payment.bankAccountNo && !receivers.includes(payment.bankAccountNo)) {
      logger.warn(log, 'Webhook SePay: tiền vào tài khoản khác tài khoản của quầy');
      return { matched: false, reason: 'ACCOUNT_MISMATCH', orderNumber: payment.order.orderNumber };
    }
    if (input.transferAmount < payment.amount.toNumber()) {
      logger.warn(log, 'Webhook SePay: chuyển thiếu tiền');
      return { matched: false, reason: 'AMOUNT_TOO_LOW', orderNumber: payment.order.orderNumber };
    }

    const providerRef = `SEPAY-${input.id}`;
    try {
      const paid = await prisma.$transaction((tx) => markTransferPaid(tx, payment, { provider: 'SEPAY', providerRef }));
      if (!paid) return { matched: true, reason: 'ALREADY_PAID', orderNumber: payment.order.orderNumber };
    } catch (error) {
      // Cùng một giao dịch SePay gửi 2 lần đồng thời → trùng providerRef (UNIQUE)
      if ((error as { code?: string }).code === 'P2002') return { matched: true, reason: 'DUPLICATE', orderNumber: payment.order.orderNumber };
      throw error;
    }
    logger.info(log, 'Đã xác nhận thanh toán chuyển khoản qua SePay');
    return { matched: true, orderNumber: payment.order.orderNumber };
  },

  /** Chủ quầy/nhân viên tự xác nhận đã thấy tiền vào tài khoản (khi không dùng webhook) */
  async confirmManually(stallId: number | undefined, orderId: number, userId: number) {
    const payment = await prisma.payment.findFirst({
      where: { orderId, ...(stallId !== undefined && { order: { stallId } }) },
      include: paymentWithOrder,
    });
    if (!payment) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (payment.method !== 'VIETQR') throw AppError.unprocessable('Đơn này trả tiền mặt khi nhận món, không cần xác nhận chuyển khoản');
    if (payment.status === 'PAID') throw AppError.conflict('Đơn này đã được xác nhận thanh toán');

    const paid = await prisma.$transaction((tx) => markTransferPaid(tx, payment, { provider: 'MANUAL', confirmedById: userId }));
    if (!paid) throw AppError.conflict('Đơn này vừa được xác nhận thanh toán');
  },

  /**
   * Huỷ các đơn chuyển khoản quá hạn mà chưa nhận được tiền. Chạy định kỳ trong server.ts.
   * Điều kiện paymentStatus = UNPAID trong câu lệnh cập nhật: tiền về đúng lúc thì đơn không bị huỷ.
   */
  async expireUnpaidOrders({ now = new Date(), orderId }: { now?: Date; orderId?: number } = {}): Promise<number> {
    const due = await prisma.order.findMany({
      where: {
        ...(orderId !== undefined && { id: orderId }),
        status: 'PENDING',
        paymentMethod: 'VIETQR',
        paymentStatus: 'UNPAID',
        payment: { expiresAt: { lte: now } },
      },
      select: { id: true, orderNumber: true, studentId: true, stallId: true },
      take: 200,
    });

    let expired = 0;
    for (const order of due) {
      const reason = 'Quá hạn thanh toán chuyển khoản';
      const done = await prisma.$transaction(async (tx) => {
        const { count } = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING', paymentStatus: 'UNPAID' },
          data: { status: 'CANCELLED', paymentStatus: 'VOIDED', cancelReason: reason, cancelledAt: now },
        });
        if (count === 0) return false;
        await tx.payment.updateMany({ where: { orderId: order.id, status: 'UNPAID' }, data: { status: 'VOIDED' } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: 'PENDING', toStatus: 'CANCELLED', note: reason } });
        const staff = await tx.vendorMembership.findMany({ where: { stallId: order.stallId }, select: { userId: true } });
        await tx.notification.createMany({
          data: [order.studentId, ...staff.map((s) => s.userId)].map((userId) => ({
            userId,
            orderId: order.id,
            type: 'ORDER_STATUS' as const,
            title: `Đơn ${order.orderNumber} đã bị huỷ`,
            message: 'Đơn tự huỷ vì chưa nhận được chuyển khoản trong thời gian cho phép.',
          })),
        });
        return true;
      });
      if (done) expired++;
    }
    if (expired > 0) logger.info({ expired }, 'Đã huỷ đơn chuyển khoản quá hạn');
    return expired;
  },
};
