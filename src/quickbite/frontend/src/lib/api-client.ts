import axios, { AxiosError } from 'axios';
import type { ApiErrorBody, ApiSuccess } from '@/types/api';

/**
 * Axios instance dùng chung. Xác thực bằng cookie httpOnly do backend đặt,
 * nên KHÔNG lưu token trong localStorage.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** Lỗi API đã được chuẩn hoá để hiển thị cho người dùng */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error) {
      return new ApiError(body.error.message, error.response?.status ?? 0, body.error.code, body.error.details);
    }
    if (!error.response) {
      return new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.', 0, 'NETWORK_ERROR');
    }
    return new ApiError(`Lỗi máy chủ (${error.response.status})`, error.response.status, 'HTTP_ERROR');
  }
  return new ApiError('Đã xảy ra lỗi không xác định', 0, 'UNKNOWN');
}

/** Gọi API và trả về phần `data` (hoặc ném ApiError) */
export async function request<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  try {
    const res = await promise;
    return res.data.data;
  } catch (error) {
    throw toApiError(error);
  }
}
