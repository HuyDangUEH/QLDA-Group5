import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ô tìm kiếm lớn ở trang chủ: gửi tới /mon-an?q=... */
export function SearchBox({ className }: { className?: string }) {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/mon-an?q=${encodeURIComponent(q)}` : '/mon-an');
  };

  return (
    <form role="search" onSubmit={submit} className={cn('flex w-full items-center gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-gray-200', className)}>
      <label htmlFor="hero-search" className="sr-only">
        Tìm món ăn
      </label>
      <Search className="ml-2 size-5 shrink-0 text-navy-400" aria-hidden />
      <input
        id="hero-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Hôm nay bạn muốn ăn gì? Phở, cơm chiên, trà sữa..."
        className="h-11 min-w-0 flex-1 bg-transparent text-base text-navy-900 placeholder:text-gray-400 focus:outline-none"
      />
      <button type="submit" className="h-11 shrink-0 rounded-xl bg-brand-500 px-5 font-semibold text-white transition hover:bg-brand-600">
        Tìm
      </button>
    </form>
  );
}
