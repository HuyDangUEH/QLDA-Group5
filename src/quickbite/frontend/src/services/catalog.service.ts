import { apiClient, request, toApiError } from '@/lib/api-client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { Category, HomeData, MenuItem, MenuItemDetail, StallDetail, StallSummary } from '@/types/models';

export type MenuSort = 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'name';

export interface MenuItemFilters {
  q?: string;
  category?: string;
  stall?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: MenuSort;
  page?: number;
  pageSize?: number;
}

/** Bỏ tham số rỗng để URL gọn */
const cleanParams = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false));

export const catalogService = {
  home: () => request(apiClient.get<ApiSuccess<HomeData>>('/home')),

  categories: () => request(apiClient.get<ApiSuccess<Category[]>>('/categories')),

  stalls: (q?: string) => request(apiClient.get<ApiSuccess<StallSummary[]>>('/stalls', { params: cleanParams({ q }) })),

  stall: (slug: string) => request(apiClient.get<ApiSuccess<StallDetail>>(`/stalls/${encodeURIComponent(slug)}`)),

  async menuItems(filters: MenuItemFilters): Promise<{ items: MenuItem[]; meta: PaginationMeta }> {
    try {
      const res = await apiClient.get<ApiSuccess<MenuItem[]>>('/menu-items', { params: cleanParams(filters) });
      return { items: res.data.data, meta: res.data.meta! };
    } catch (error) {
      throw toApiError(error);
    }
  },

  menuItem: (id: number) => request(apiClient.get<ApiSuccess<MenuItemDetail>>(`/menu-items/${id}`)),
};

export const catalogKeys = {
  home: ['catalog', 'home'] as const,
  categories: ['catalog', 'categories'] as const,
  stalls: (q?: string) => ['catalog', 'stalls', q ?? ''] as const,
  stall: (slug: string) => ['catalog', 'stall', slug] as const,
  menuItems: (filters: MenuItemFilters) => ['catalog', 'menu-items', filters] as const,
  menuItem: (id: number) => ['catalog', 'menu-item', id] as const,
};
