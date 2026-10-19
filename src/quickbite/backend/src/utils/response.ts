import type { Response } from 'express';

/**
 * Định dạng phản hồi thống nhất:
 *   Thành công: { success: true, data, meta? }
 *   Lỗi:        { success: false, error: { code, message, details? } }
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta) {
  return res.status(statusCode).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
