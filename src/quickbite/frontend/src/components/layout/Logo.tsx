import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 font-extrabold tracking-tight', className)} aria-label="QuickBite — Trang chủ">
      <img src="/favicon.svg" alt="" className="size-9" />
      <span className={cn('text-xl', light ? 'text-white' : 'text-navy-900')}>
        Quick<span className="text-brand-500">Bite</span>
      </span>
    </Link>
  );
}
