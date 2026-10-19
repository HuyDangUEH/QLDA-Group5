import { Router } from 'express';
import { z } from 'zod';
import { authenticate, currentUser, requireRole } from '../../middlewares/auth.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import { sendSuccess } from '../../utils/response.js';
import { idParamSchema } from '../../utils/validation.js';

export const createReviewSchema = z.object({
  rating: z.coerce.number({ error: 'Vui lòng chọn số sao' }).int().min(1, 'Vui lòng chọn từ 1 đến 5 sao').max(5, 'Vui lòng chọn từ 1 đến 5 sao'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Nhận xét tối đa 1000 ký tự')
    .transform((v) => (v === '' ? null : v))
    .nullish(),
});

/**
 * Sinh viên đánh giá đơn của mình: chỉ đơn ĐÃ HOÀN THÀNH, mỗi đơn một lần.
 * (Gắn vào ordersRouter: POST /orders/:id/review)
 */
export async function createReviewForOrder(studentId: number, orderId: number, input: z.infer<typeof createReviewSchema>) {
  const order = await prisma.order.findFirst({ where: { id: orderId, studentId }, select: { id: true, status: true, stallId: true, review: { select: { id: true } } } });
  if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
  if (order.status !== 'COMPLETED') throw AppError.unprocessable('Chỉ đánh giá được đơn đã hoàn thành');
  if (order.review) throw AppError.conflict('Bạn đã đánh giá đơn này rồi');

  return prisma.review.create({
    data: { orderId: order.id, studentId, stallId: order.stallId, rating: input.rating, comment: input.comment ?? null },
    select: { id: true, rating: true, comment: true, createdAt: true },
  });
}

/** Báo cáo đánh giá không phù hợp (người dùng đã đăng nhập) */
export const reviewsRouter = Router();

reviewsRouter.post('/:id/report', authenticate, requireRole('STUDENT', 'VENDOR'), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { reason } = z
    .object({ reason: z.string().trim().min(5, 'Vui lòng mô tả lý do (ít nhất 5 ký tự)').max(255, 'Lý do tối đa 255 ký tự') })
    .parse(req.body);
  const user = currentUser(req);
  const review = await prisma.review.findUnique({ where: { id }, select: { id: true, status: true, studentId: true, stallId: true } });
  if (!review || review.status === 'HIDDEN') throw AppError.notFound('Không tìm thấy đánh giá');
  if (review.studentId === user.id) throw AppError.unprocessable('Bạn không thể báo cáo đánh giá của chính mình');
  // Chủ quầy / nhân viên không được báo cáo đánh giá về chính quầy mình (tránh "dọn" đánh giá xấu)
  if (user.role === 'VENDOR' && (await prisma.vendorMembership.count({ where: { userId: user.id, stallId: review.stallId } }))) {
    throw AppError.forbidden('Bạn không thể báo cáo đánh giá về quầy của mình. Hãy liên hệ quản trị viên nếu đánh giá vi phạm.');
  }

  // Báo cáo KHÔNG ẩn đánh giá: đánh giá vẫn hiển thị cho tới khi admin kiểm duyệt.
  // Đã có báo cáo đang chờ xử lý thì giữ nguyên lý do đầu tiên (không cho ghi đè).
  if (review.status !== 'REPORTED') {
    await prisma.review.update({ where: { id }, data: { status: 'REPORTED', reportReason: reason } });
  }
  sendSuccess(res, { message: 'Cảm ơn bạn! Quản trị viên sẽ xem xét đánh giá này.' });
});
