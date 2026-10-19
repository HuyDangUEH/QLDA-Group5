import { apiClient, request, toApiError } from '@/lib/api-client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { AccountStatus, Role, User } from '@/features/auth/types';
import type { OrderStatus } from '@/types/models';
import type { VendorOrder } from '@/types/vendor';
import type {
  AdminCategory,
  AdminDashboard,
  AdminOrderRow,
  AdminPickupLocation,
  AdminReview,
  AdminStall,
  AdminUserDetail,
  AuditLog,
  ReviewStatus,
  StallInput,
  UserInput,
  UserUpdateInput,
} from '@/types/admin';

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Role;
  status?: AccountStatus;
}

export interface AdminOrderFilters {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  stallId?: number;
  q?: string;
  from?: string;
  to?: string;
}

const clean = (params: object) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));

/** GET danh sách có phân trang → { items, meta } */
async function paged<T>(url: string, params: object): Promise<{ items: T[]; meta: PaginationMeta }> {
  try {
    const res = await apiClient.get<ApiSuccess<T[]>>(url, { params: clean(params) });
    return { items: res.data.data, meta: res.data.meta! };
  } catch (error) {
    throw toApiError(error);
  }
}

export const adminService = {
  dashboard: () => request(apiClient.get<ApiSuccess<AdminDashboard>>('/admin/dashboard')),

  // Người dùng
  async listUsers(params: ListUsersParams): Promise<{ users: User[]; meta: PaginationMeta }> {
    const { items, meta } = await paged<User>('/admin/users', params);
    return { users: items, meta };
  },
  user: async (id: number) => (await request(apiClient.get<ApiSuccess<{ user: AdminUserDetail }>>(`/admin/users/${id}`))).user,
  createUser: async (input: UserInput) => (await request(apiClient.post<ApiSuccess<{ user: User }>>('/admin/users', input))).user,
  updateUser: async (id: number, input: UserUpdateInput) => (await request(apiClient.patch<ApiSuccess<{ user: User }>>(`/admin/users/${id}`, input))).user,
  resetPassword: (id: number, newPassword: string) =>
    request(apiClient.post<ApiSuccess<{ message: string }>>(`/admin/users/${id}/reset-password`, { newPassword })),

  // Quầy ăn
  stalls: (q?: string) => request(apiClient.get<ApiSuccess<AdminStall[]>>('/admin/stalls', { params: clean({ q }) })),
  createStall: async (input: StallInput) => (await request(apiClient.post<ApiSuccess<{ stall: AdminStall }>>('/admin/stalls', input))).stall,
  updateStall: async (id: number, input: Partial<StallInput> & { isAcceptingOrders?: boolean }) =>
    (await request(apiClient.patch<ApiSuccess<{ stall: AdminStall }>>(`/admin/stalls/${id}`, input))).stall,
  addMember: async (stallId: number, email: string, role: 'OWNER' | 'STAFF') =>
    (await request(apiClient.post<ApiSuccess<{ stall: AdminStall }>>(`/admin/stalls/${stallId}/members`, { email, role }))).stall,
  updateMember: async (stallId: number, userId: number, role: 'OWNER' | 'STAFF') =>
    (await request(apiClient.patch<ApiSuccess<{ stall: AdminStall }>>(`/admin/stalls/${stallId}/members/${userId}`, { role }))).stall,
  removeMember: async (stallId: number, userId: number) =>
    (await request(apiClient.delete<ApiSuccess<{ stall: AdminStall }>>(`/admin/stalls/${stallId}/members/${userId}`))).stall,

  // Danh mục & điểm nhận
  categories: () => request(apiClient.get<ApiSuccess<AdminCategory[]>>('/admin/categories')),
  createCategory: async (input: Partial<AdminCategory>) =>
    (await request(apiClient.post<ApiSuccess<{ category: AdminCategory }>>('/admin/categories', input))).category,
  updateCategory: async (id: number, input: Partial<AdminCategory>) =>
    (await request(apiClient.patch<ApiSuccess<{ category: AdminCategory }>>(`/admin/categories/${id}`, input))).category,
  deleteCategory: (id: number) => request(apiClient.delete<ApiSuccess<{ id: number }>>(`/admin/categories/${id}`)),

  pickupLocations: () => request(apiClient.get<ApiSuccess<AdminPickupLocation[]>>('/admin/pickup-locations')),
  createPickupLocation: async (input: Partial<AdminPickupLocation>) =>
    (await request(apiClient.post<ApiSuccess<{ location: AdminPickupLocation }>>('/admin/pickup-locations', input))).location,
  updatePickupLocation: async (id: number, input: Partial<AdminPickupLocation>) =>
    (await request(apiClient.patch<ApiSuccess<{ location: AdminPickupLocation }>>(`/admin/pickup-locations/${id}`, input))).location,

  // Đơn hàng
  orders: (filters: AdminOrderFilters) => paged<AdminOrderRow>('/admin/orders', filters),
  order: async (id: number) => (await request(apiClient.get<ApiSuccess<{ order: VendorOrder }>>(`/admin/orders/${id}`))).order,
  updateOrderStatus: async (id: number, status: OrderStatus, reason?: string) =>
    (await request(apiClient.patch<ApiSuccess<{ order: VendorOrder }>>(`/admin/orders/${id}/status`, { status, reason }))).order,

  // Đánh giá
  reviews: (params: { status?: ReviewStatus; page?: number; pageSize?: number }) => paged<AdminReview>('/admin/reviews', params),
  moderateReview: (id: number, status: 'VISIBLE' | 'HIDDEN') =>
    request(apiClient.patch<ApiSuccess<{ review: AdminReview }>>(`/admin/reviews/${id}`, { status })),

  // Nhật ký
  auditLogs: (params: { action?: string; page?: number; pageSize?: number }) => paged<AuditLog>('/admin/audit-logs', params),
};

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  users: (params: ListUsersParams) => ['admin', 'users', params] as const,
  stalls: ['admin', 'stalls'] as const,
  categories: ['admin', 'categories'] as const,
  pickups: ['admin', 'pickup-locations'] as const,
  orders: (filters: AdminOrderFilters) => ['admin', 'orders', filters] as const,
  order: (id: number) => ['admin', 'order', id] as const,
  reviews: (params: object) => ['admin', 'reviews', params] as const,
  audit: (params: object) => ['admin', 'audit', params] as const,
};
