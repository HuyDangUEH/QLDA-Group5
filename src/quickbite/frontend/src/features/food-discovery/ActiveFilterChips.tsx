import { X } from 'lucide-react';
import type { Category, StallSummary } from '@/types/models';
import { PRICE_RANGES, type FilterState } from './use-menu-filters';

interface ActiveFilterChipsProps {
  state: FilterState;
  update: (patch: Partial<FilterState>) => void;
  categories: Category[];
  stalls: StallSummary[];
  className?: string;
}

/**
 * Hàng chip gọn hiển thị các bộ lọc đang áp dụng; bấm × để bỏ từng bộ lọc.
 * Dùng trên điện thoại thay cho khối bộ lọc đầy đủ (bộ lọc đầy đủ mở trong bảng trượt).
 */
export function ActiveFilterChips({ state, update, categories, stalls, className }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; clear: Partial<FilterState> }[] = [];
  if (state.q) chips.push({ key: 'q', label: `“${state.q}”`, clear: { q: '' } });
  if (state.category)
    chips.push({
      key: 'category',
      label: categories.find((c) => c.slug === state.category)?.name ?? state.category,
      clear: { category: '' },
    });
  if (state.stall)
    chips.push({
      key: 'stall',
      label: stalls.find((s) => s.slug === state.stall)?.name ?? state.stall,
      clear: { stall: '' },
    });
  if (state.price)
    chips.push({
      key: 'price',
      label: PRICE_RANGES.find((r) => r.key === state.price)?.label ?? state.price,
      clear: { price: '' },
    });
  if (state.available) chips.push({ key: 'available', label: 'Còn hàng', clear: { available: false } });
  if (chips.length === 0) return null;

  return (
    <ul aria-label="Bộ lọc đang áp dụng" className={`flex gap-2 overflow-x-auto pb-1 ${className ?? ''}`}>
      {chips.map((c) => (
        <li key={c.key} className="shrink-0">
          <button
            type="button"
            onClick={() => update(c.clear)}
            aria-label={`Bỏ bộ lọc ${c.label}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pr-2.5 pl-3.5 text-sm font-medium whitespace-nowrap text-brand-700 hover:bg-brand-100"
          >
            {c.label}
            <X className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
