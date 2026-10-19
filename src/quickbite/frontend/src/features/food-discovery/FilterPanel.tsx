import { useEffect, useId, useState } from 'react';
import { Search } from 'lucide-react';
import { inputClass } from '@/components/ui/styles';
import type { Category, StallSummary } from '@/types/models';
import { cn } from '@/lib/utils';
import { PRICE_RANGES, type FilterState } from './use-menu-filters';

interface FilterPanelProps {
  state: FilterState;
  update: (patch: Partial<FilterState>) => void;
  reset: () => void;
  activeCount: number;
  categories: Category[];
  stalls: StallSummary[];
}

const groupTitle = 'mb-2.5 text-sm font-bold text-navy-900';

export function FilterPanel({ state, update, reset, activeCount, categories, stalls }: FilterPanelProps) {
  // Ô tìm kiếm có state riêng, đợi người dùng ngừng gõ 400ms mới cập nhật URL
  const uid = useId();
  const [query, setQuery] = useState(state.q);
  const [lastUrlQuery, setLastUrlQuery] = useState(state.q);
  if (state.q !== lastUrlQuery) {
    // URL đổi từ bên ngoài (nút Back, link mới) → đồng bộ lại ô nhập
    setLastUrlQuery(state.q);
    setQuery(state.q);
  }

  useEffect(() => {
    if (query.trim() === state.q) return;
    const t = setTimeout(() => update({ q: query.trim() }), 400);
    return () => clearTimeout(t);
  }, [query, state.q, update]);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={`${uid}-q`} className={groupTitle}>
          Tìm kiếm
        </label>
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            id={`${uid}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tên món, mô tả..."
            className={cn(inputClass(), 'pl-10')}
          />
        </div>
      </div>

      <fieldset>
        <legend className={groupTitle}>Danh mục</legend>
        <div className="flex flex-wrap gap-2">
          {[{ slug: '', name: 'Tất cả', id: 0 }, ...categories].map((c) => {
            const active = state.category === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => update({ category: c.slug })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  active ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-200 bg-white text-navy-700 hover:border-brand-300',
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${uid}-stall`} className={groupTitle}>
          Quầy ăn
        </label>
        <select id={`${uid}-stall`} value={state.stall} onChange={(e) => update({ stall: e.target.value })} className={cn(inputClass(), 'mt-2.5')}>
          <option value="">Tất cả quầy</option>
          {stalls.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={groupTitle}>Khoảng giá</legend>
        <div className="space-y-2">
          {PRICE_RANGES.map((r) => (
            <label key={r.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-700">
              <input
                type="radio"
                name={`${uid}-price`}
                value={r.key}
                checked={state.price === r.key}
                onChange={() => update({ price: r.key })}
                className="size-4 accent-brand-500"
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-navy-800">
        <input
          type="checkbox"
          checked={state.available}
          onChange={(e) => update({ available: e.target.checked })}
          className="size-4 rounded accent-brand-500"
        />
        Chỉ hiện món còn hàng
      </label>

      {activeCount > 0 && (
        <button type="button" onClick={reset} className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
          Xoá tất cả bộ lọc ({activeCount})
        </button>
      )}
    </div>
  );
}
