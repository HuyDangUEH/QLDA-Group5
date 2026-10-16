import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

export function SectionHeader({ title, subtitle, to, linkLabel = 'Xem tất cả', id }: { title: string; subtitle?: ReactNode; to?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-extrabold sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-navy-500">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
