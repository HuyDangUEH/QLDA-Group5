import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { inputClass } from '@/components/ui/styles';
import { catalogKeys, catalogService, type MenuSort } from '@/services/catalog.service';
import { FilterPanel } from '@/features/food-discovery/FilterPanel';
import { FoodCard, FoodGridSkeleton } from '@/features/food-discovery/FoodCard';
import { useFoodDetailDialog } from '@/features/food-discovery/FoodDetailDialog';
import { SORT_OPTIONS, useMenuFilters } from '@/features/food-discovery/use-menu-filters';
import { cn } from '@/lib/utils';

export function FoodDiscoveryPage() {
  const { state, update, reset, apiFilters, activeCount } = useMenuFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detail = useFoodDetailDialog();

  const categories = useQuery({ queryKey: catalogKeys.categories, queryFn: catalogService.categories, staleTime: 5 * 60_000 });
  const stalls = useQuery({ queryKey: catalogKeys.stalls(), queryFn: () => catalogService.stalls(), staleTime: 5 * 60_000 });
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: catalogKeys.menuItems(apiFilters),
    queryFn: () => catalogService.menuItems(apiFilters),
    placeholderData: keepPreviousData,
  });

  const currentCategory = categories.data?.find((c) => c.slug === state.category);

  const goToPage = (page: number) => {
    update({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const panel = (
    <FilterPanel
      state={state}
      update={update}
      reset={reset}
      activeCount={activeCount}
      categories={categories.data ?? []}
      stalls={stalls.data ?? []}
    />
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{currentCategory ? currentCategory.name : state.q ? `Kết quả cho “${state.q}”` : 'Khám phá món ăn'}</h1>
          <p className="mt-1 text-navy-500" aria-live="polite">
            {data ? `${data.meta.total} món` : 'Đang tìm món...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="mobile-filters">
            <SlidersHorizontal className="size-4" aria-hidden />
            Bộ lọc{activeCount > 0 && ` (${activeCount})`}
          </Button>
          <label htmlFor="sort" className="sr-only">
            Sắp xếp
          </label>
          <select id="sort" value={state.sort} onChange={(e) => update({ sort: e.target.value as MenuSort })} className={cn(inputClass(), 'w-auto')}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtersOpen && (
        <Card id="mobile-filters" className="mt-4 p-5 lg:hidden">
          {panel}
        </Card>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Bộ lọc" className="hidden lg:block">
          <Card className="sticky top-24 p-5">{panel}</Card>
        </aside>

        <div className={cn('transition-opacity', isFetching && !isPending && 'opacity-60')}>
          {isPending ? (
            <FoodGridSkeleton count={PAGE_SKELETONS} />
          ) : error ? (
            <ErrorState message={error.message} onRetry={() => refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-7" aria-hidden />}
              title="Không tìm thấy món phù hợp"
              description="Thử từ khoá khác hoặc bỏ bớt bộ lọc nhé."
              action={
                activeCount > 0 && (
                  <Button variant="outline" onClick={reset}>
                    Xoá bộ lọc
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
                {data.items.map((item) => (
                  <FoodCard key={item.id} item={item} onSelect={detail.open} />
                ))}
              </div>
              {data.meta.totalPages > 1 && (
                <div className="mt-10">
                  <Pagination meta={data.meta} onPageChange={goToPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {detail.dialog}
    </section>
  );
}

const PAGE_SKELETONS = 6;
