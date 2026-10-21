import { apiClient, request, toApiError } from '@/lib/api-client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { OrderStatus } from '@/types/models';
import type {
  MenuItemInput,
  SalesReport,
  VendorDashboard,
  VendorMenuItem,
  VendorOrder,
  VendorOrderRow,
  VendorOrderTab,
  VendorStall,
  VendorStallDetail,
} from '@/types/vendor';

export interface VendorOrderFilters {
  tab?: VendorOrderTab;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export type TabCounts = Record<VendorOrderTab, number>;

export interface StallProfileInput {
  description?: string | null;
  phone?: string | null;
  openTime?: string;
  closeTime?: string;
  imageUrl?: string | null;
  isAcceptingOrders?: boolean;
  /** null = tắt nhận chuyển khoản */
  bankAccount?: { bankBin: string; accountNo: string; accountName: string } | null;
  /** Số phút chờ chuyển khoản (5–60) */
  paymentTimeoutMinutes?: number;
}

const clean = (params: object) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));

export const vendorService = {
  myStalls: async () => (await request(apiClient.get<ApiSuccess<{ stalls: VendorStall[] }>>('/vendor/stalls'))).stalls,

  stall: (stallId: number) => request(apiClient.get<ApiSuccess<VendorStallDetail>>(`/vendor/stalls/${stallId}`)),

  updateStall: async (stallId: number, input: StallProfileInput) =>
    (await request(apiClient.patch<ApiSuccess<{ stall: VendorStall }>>(`/vendor/stalls/${stallId}`, input))).stall,

  setAcceptingOrders: async (stallId: number, isAcceptingOrders: boolean) =>
    (await request(apiClient.patch<ApiSuccess<{ stall: VendorStall }>>(`/vendor/stalls/${stallId}/accepting-orders`, { isAcceptingOrders }))).stall,

  dashboard: (stallId: number) => request(apiClient.get<ApiSuccess<VendorDashboard>>(`/vendor/stalls/${stallId}/dashboard`)),

  async orders(stallId: number, filters: VendorOrderFilters): Promise<{ orders: VendorOrderRow[]; meta: PaginationMeta & { tabCounts: TabCounts } }> {
    try {
      const res = await apiClient.get<{ success: true; data: VendorOrderRow[]; meta: PaginationMeta & { tabCounts: TabCounts } }>(
        `/vendor/stalls/${stallId}/orders`,
        { params: clean(filters) },
      );
      return { orders: res.data.data, meta: res.data.meta };
    } catch (error) {
      throw toApiError(error);
    }
  },

  order: async (stallId: number, orderId: number) =>
    (await request(apiClient.get<ApiSuccess<{ order: VendorOrder }>>(`/vendor/stalls/${stallId}/orders/${orderId}`))).order,

  confirmPayment: async (stallId: number, orderId: number) =>
    (await request(apiClient.post<ApiSuccess<{ order: VendorOrder }>>(`/vendor/stalls/${stallId}/orders/${orderId}/confirm-payment`))).order,

  updateOrderStatus: async (stallId: number, orderId: number, status: OrderStatus, reason?: string) =>
    (await request(apiClient.patch<ApiSuccess<{ order: VendorOrder }>>(`/vendor/stalls/${stallId}/orders/${orderId}/status`, { status, reason }))).order,

  menuItems: (stallId: number, params: { q?: string; categoryId?: number; status?: 'active' | 'inactive' | 'all' }) =>
    request(apiClient.get<ApiSuccess<VendorMenuItem[]>>(`/vendor/stalls/${stallId}/menu-items`, { params: clean(params) })),

  createMenuItem: (stallId: number, input: MenuItemInput) =>
    request(apiClient.post<ApiSuccess<VendorMenuItem>>(`/vendor/stalls/${stallId}/menu-items`, input)),

  updateMenuItem: (stallId: number, itemId: number, input: Partial<MenuItemInput> & { isActive?: boolean }) =>
    request(apiClient.patch<ApiSuccess<VendorMenuItem>>(`/vendor/stalls/${stallId}/menu-items/${itemId}`, input)),

  deactivateMenuItem: (stallId: number, itemId: number) =>
    request(apiClient.delete<ApiSuccess<VendorMenuItem>>(`/vendor/stalls/${stallId}/menu-items/${itemId}`)),

  async uploadImage(stallId: number, file: File, type: 'menu' | 'stall' = 'menu') {
    const form = new FormData();
    form.append('image', file);
    const data = await request(
      apiClient.post<ApiSuccess<{ url: string }>>(`/vendor/stalls/${stallId}/uploads`, form, {
        params: { type },
        // Để trình duyệt tự đặt Content-Type multipart kèm boundary
        headers: { 'Content-Type': undefined },
      }),
    );
    return data.url;
  },

  reports: (stallId: number, range: { from: string; to: string }) =>
    request(apiClient.get<ApiSuccess<SalesReport>>(`/vendor/stalls/${stallId}/reports`, { params: range })),
};

export const vendorKeys = {
  all: ['vendor'] as const,
  stalls: ['vendor', 'stalls'] as const,
  stall: (id: number) => ['vendor', id, 'stall'] as const,
  dashboard: (id: number) => ['vendor', id, 'dashboard'] as const,
  orders: (id: number, filters?: VendorOrderFilters) => ['vendor', id, 'orders', filters ?? {}] as const,
  order: (id: number, orderId: number) => ['vendor', id, 'order', orderId] as const,
  menu: (id: number) => ['vendor', id, 'menu'] as const,
  reports: (id: number, range: { from: string; to: string }) => ['vendor', id, 'reports', range] as const,
};
