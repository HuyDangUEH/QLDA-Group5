import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../config/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu gửi lên không hợp lệ',
        details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại (trùng giá trị duy nhất)' },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu' },
      });
    }
  }

  // Lỗi tải file (quá dung lượng, quá số file...)
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `Ảnh quá lớn, tối đa ${env.MAX_UPLOAD_MB}MB` : 'Tải file không thành công, vui lòng thử lại';
    return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
  }

  // JSON sai cú pháp từ express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Body JSON không hợp lệ' },
    });
  }

  // Lỗi không lường trước: ghi log đầy đủ nhưng không lộ stack trace ra ngoài
  logger.error({ err, path: req.originalUrl }, 'Lỗi chưa được xử lý');
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau' },
  });
};
