import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

export function QuantitySelector({ value, onChange, min = 1, max = 20, disabled, size = 'md', label = 'Số lượng' }: QuantitySelectorProps) {
  const btn = cn(
    'flex items-center justify-center rounded-full border border-gray-300 bg-white text-navy-700 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-navy-700',
    size === 'sm' ? 'size-8' : 'size-10',
  );
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Giảm số lượng">
        <Minus className="size-4" aria-hidden />
      </button>
      <output aria-live="polite" className={cn('min-w-6 text-center font-bold tabular-nums', size === 'md' && 'text-lg')}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Tăng số lượng">
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
