/**
 * Lỗi nghiệp vụ có chủ đích. Middleware xử lý lỗi sẽ trả `message` này cho client.
 * Các lỗi khác (không phải AppError) bị coi là lỗi nội bộ và được che đi.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Yêu cầu không hợp lệ', details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Bạn cần đăng nhập để tiếp tục') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Dữ liệu bị xung đột', details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static unprocessable(message: string, details?: unknown) {
    return new AppError(422, 'BUSINESS_RULE_VIOLATION', message, details);
  }
}
