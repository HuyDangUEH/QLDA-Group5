import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';
import { sendSuccess } from '../../utils/response.js';
import { VIETQR_BANKS } from './vietqr-banks.js';
import { paymentsService, sepayWebhookSchema } from './payments.service.js';

export const paymentsRouter = Router();

// Danh sách ngân hàng hỗ trợ VietQR (chủ quầy chọn khi cài tài khoản nhận tiền)
paymentsRouter.get('/banks', (_req, res) => {
  sendSuccess(res, VIETQR_BANKS);
});

const digest = (v: string) => createHash('sha256').update(v).digest();

/** SePay gửi header "Authorization: Apikey <API_KEY>". So sánh hằng thời gian để không lộ khoá qua thời gian phản hồi */
const requireSepayKey: RequestHandler = (req, _res, next) => {
  if (!env.SEPAY_WEBHOOK_API_KEY) return next(AppError.notFound('Webhook SePay chưa được bật'));
  const match = /^Apikey\s+(.+)$/i.exec(req.get('authorization') ?? '');
  if (!match || !timingSafeEqual(digest(match[1]!.trim()), digest(env.SEPAY_WEBHOOK_API_KEY))) {
    return next(AppError.unauthorized('API key webhook không hợp lệ'));
  }
  next();
};

// Webhook biến động số dư từ SePay → tự xác nhận đơn chuyển khoản
paymentsRouter.post('/sepay/webhook', requireSepayKey, async (req, res) => {
  const result = await paymentsService.handleSepayWebhook(sepayWebhookSchema.parse(req.body));
  // SePay coi phản hồi 200 + success:true là đã nhận; giao dịch không khớp đơn nào cũng trả 200
  sendSuccess(res, result);
});
