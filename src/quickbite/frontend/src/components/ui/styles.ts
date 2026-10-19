import { cn } from '@/lib/utils';

const buttonVariants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  secondary: 'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950',
  outline: 'border border-gray-300 bg-white text-navy-800 hover:bg-gray-50 active:bg-gray-100',
  ghost: 'text-navy-700 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
} as const;

const buttonSizes = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'size-10',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

/** Lớp CSS của nút, dùng cho cả <Button> và <Link> trông giống nút */
export function buttonClass({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-60',
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

/** Lớp CSS của ô nhập liệu (input, select) */
export const inputClass = (invalid?: boolean) =>
  cn(
    'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-navy-900 placeholder:text-gray-400 transition',
    'focus:outline-none focus:ring-4',
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-gray-300 focus:border-brand-400 focus:ring-brand-100',
    'disabled:bg-gray-100 disabled:text-gray-500',
  );
