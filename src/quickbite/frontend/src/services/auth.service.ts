import { apiClient, ApiError, request } from '@/lib/api-client';
import type { ApiSuccess } from '@/types/api';
import type { User } from '@/features/auth/types';

type UserResponse = ApiSuccess<{ user: User }>;

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  studentCode?: string;
}

export interface ProfilePayload {
  fullName: string;
  phone?: string;
  studentCode?: string;
}

export const authService = {
  /** Trả về người dùng hiện tại, hoặc null nếu chưa đăng nhập */
  async me(): Promise<User | null> {
    try {
      const data = await request(apiClient.get<UserResponse>('/auth/me'));
      return data.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  login: async (payload: { email: string; password: string }) =>
    (await request(apiClient.post<UserResponse>('/auth/login', payload))).user,

  register: async (payload: RegisterPayload) =>
    (await request(apiClient.post<UserResponse>('/auth/register', payload))).user,

  logout: () => request(apiClient.post<ApiSuccess<{ message: string }>>('/auth/logout')),

  updateProfile: async (payload: ProfilePayload) =>
    (await request(apiClient.patch<UserResponse>('/users/me', payload))).user,

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request(apiClient.patch<ApiSuccess<{ message: string }>>('/users/me/password', payload)),
};
