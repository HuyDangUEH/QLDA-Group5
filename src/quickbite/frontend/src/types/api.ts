/** Định dạng phản hồi chung từ backend QuickBite */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[] | unknown;
  };
}

export interface HealthStatus {
  status: 'ok';
  database: 'connected';
  latencyMs: number;
}
