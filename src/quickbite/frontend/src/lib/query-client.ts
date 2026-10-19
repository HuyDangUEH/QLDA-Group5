import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ApiError, apiClient } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Không thử lại với lỗi 4xx (sai dữ liệu, chưa đăng nhập, không có quyền...)
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

// Phiên đăng nhập hết hạn / bị thu hồi (API trả 401) → đánh dấu chưa đăng nhập.
// ProtectedRoute sẽ tự chuyển người dùng về trang đăng nhập.
apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
    queryClient.setQueryData(['auth', 'me'], null);
  }
  return Promise.reject(error);
});
