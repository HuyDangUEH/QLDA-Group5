import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, hint, icon: Icon, tone = 'neutral' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: 'neutral' | 'brand' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'bg-navy-50 text-navy-600',
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-(--radius-card) border border-gray-100 bg-white p-5 shadow-(--shadow-card)">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-navy-500">{label}</p>
        <span className={cn('flex size-9 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="size-4.5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
    </div>
  );
}
