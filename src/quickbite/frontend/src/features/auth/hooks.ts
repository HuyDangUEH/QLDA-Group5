import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import type { User } from './types';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/** Người dùng đang đăng nhập (null nếu chưa đăng nhập) */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authService.me,
    staleTime: 5 * 60_000,
  });
}

/**
 * Đổi người dùng hiện tại: xoá dữ liệu cache của phiên trước (giỏ hàng, đơn hàng...) để không lộ sang
 * người dùng mới, rồi cập nhật query "me".
 * Không dùng queryClient.clear() vì nó gỡ luôn query "me" mà Header đang theo dõi → Header không cập nhật.
 */
function switchUser(queryClient: QueryClient, user: User | null) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  queryClient.setQueryData<User | null>(authKeys.me, user);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => switchUser(queryClient, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (user) => switchUser(queryClient, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => switchUser(queryClient, null),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (user) => queryClient.setQueryData<User | null>(authKeys.me, user),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: authService.changePassword });
}
