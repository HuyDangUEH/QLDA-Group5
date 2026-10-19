import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search, Store } from 'lucide-react';
import { inputClass } from '@/components/ui/styles';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { catalogKeys, catalogService } from '@/services/catalog.service';
import { StallCard, StallGridSkeleton } from '@/features/food-discovery/StallCard';
import { cn } from '@/lib/utils';

export function StallsPage() {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 400);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: catalogKeys.stalls(q),
    queryFn: () => catalogService.stalls(q),
    placeholderData: keepPreviousData,
  });

  const openCount = data?.filter((s) => s.canOrderNow).length ?? 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Quầy ăn trong trường</h1>
          <p className="mt-1 text-navy-500" aria-live="polite">
            {data ? `${data.length} quầy · ${openCount} quầy đang nhận đơn` : 'Đang tải...'}
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <label htmlFor="stall-search" className="sr-only">
            Tìm quầy ăn
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            id="stall-search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm theo tên, vị trí..."
            className={cn(inputClass(), 'pl-10')}
          />
        </div>
      </div>

      <div className={cn('mt-8 transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <StallGridSkeleton count={6} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState icon={<Store className="size-7" aria-hidden />} title="Không tìm thấy quầy nào" description="Thử từ khoá khác nhé." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (
              <StallCard key={s.id} stall={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
