import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { MenuItemFilters, MenuSort } from '@/services/catalog.service';

/** Khoảng giá có sẵn (VND), không chồng lấn nhau. Lưu trong URL bằng khoá ngắn: ?price=30-50 */
export const PRICE_RANGES = [
  { key: '', label: 'Tất cả mức giá' },
  { key: '0-30', label: 'Từ 30.000đ trở xuống', max: 30000 },
  { key: '30-50', label: 'Trên 30.000đ – 50.000đ', min: 30001, max: 50000 },
  { key: '50-', label: 'Trên 50.000đ', min: 50001 },
] as const;

export const SORT_OPTIONS: { value: MenuSort; label: string }[] = [
  { value: 'popular', label: 'Bán chạy nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên A → Z' },
];

export const PAGE_SIZE = 12;

export interface FilterState {
  q: string;
  category: string;
  stall: string;
  price: string;
  available: boolean;
  sort: MenuSort;
  page: number;
}

const isSort = (v: string | null): v is MenuSort => SORT_OPTIONS.some((o) => o.value === v);

/** Đọc / ghi bộ lọc từ URL để có thể chia sẻ link và dùng nút Back của trình duyệt */
export function useMenuFilters() {
  const [params, setParams] = useSearchParams();

  const state: FilterState = useMemo(() => {
    const sort = params.get('sort');
    const page = Number(params.get('page'));
    return {
      q: params.get('q') ?? '',
      category: params.get('category') ?? '',
      stall: params.get('stall') ?? '',
      price: PRICE_RANGES.some((r) => r.key === params.get('price')) ? (params.get('price') ?? '') : '',
      available: params.get('available') === 'true',
      sort: isSort(sort) ? sort : 'popular',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [params]);

  /** Cập nhật một số bộ lọc; đổi bộ lọc thì quay về trang 1 */
  const update = useCallback(
    (patch: Partial<FilterState>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            const empty = value === '' || value === false || (key === 'sort' && value === 'popular') || (key === 'page' && value === 1);
            if (empty) next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: !('page' in patch) },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  const apiFilters: MenuItemFilters = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.key === state.price);
    return {
      q: state.q || undefined,
      category: state.category || undefined,
      stall: state.stall || undefined,
      minPrice: range && 'min' in range ? range.min : undefined,
      maxPrice: range && 'max' in range ? range.max : undefined,
      available: state.available || undefined,
      sort: state.sort,
      page: state.page,
      pageSize: PAGE_SIZE,
    };
  }, [state]);

  const activeCount = [state.q, state.category, state.stall, state.price, state.available].filter(Boolean).length;

  return { state, update, reset, apiFilters, activeCount };
}
