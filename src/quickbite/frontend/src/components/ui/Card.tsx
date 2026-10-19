import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-(--radius-card) border border-gray-100 bg-white shadow-(--shadow-card)', className)} {...props} />;
}
