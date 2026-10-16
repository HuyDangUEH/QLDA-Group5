import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RotateCcw, Search, UtensilsCrossed, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Switch } from '@/components/ui/Switch';
import { inputClass } from '@/components/ui/styles';
import { MenuItemFormDialog } from '@/features/vendor/MenuItemFormDialog';
import { useCurrentStallId } from '@/features/vendor/vendor-stall-context';
import { toApiError } from '@/lib/api-client';
import { catalogKeys, catalogService } from '@/services/catalog.service';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import type { VendorMenuItem } from '@/types/vendor';
import { cn, formatCurrency } from '@/lib/utils';

type StatusFilter = 'active' | 'inactive' | 'all';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Ngừng bán' },
  { value: 'all', label: 'Tất cả' },
];

export function VendorMenuPage() {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('active');
  const [categoryId, setCategoryId] = useState('');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<VendorMenuItem | 'new' | null>(null);
  const [deactivating, setDeactivating] = useState<VendorMenuItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const categories = useQuery({ queryKey: catalogKeys.categories, queryFn: catalogService.categories, staleTime: 5 * 60_000 });
  const params = { status, q: q || undefined, categoryId: categoryId ? Number(categoryId) : undefined };
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: [...vendorKeys.menu(stallId), params],
    queryFn: () => vendorService.menuItems(stallId, params),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.menu(stallId) });
    queryClient.invalidateQueries({ queryKey: ['catalog'] });
  };

  const patch = useMutation({
    mutationFn: ({ id, ...input }: { id: number; isAvailable?: boolean; isFeatured?: boolean; isActive?: boolean }) =>
      vendorService.updateMenuItem(stallId, id, input),
    onSuccess: invalidate,
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => vendorService.deactivateMenuItem(stallId, id),
    onSuccess: (item) => {
      invalidate();
      setDeactivating(null);
      toast.success(`Đã ngừng bán "${item.name}"`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Thực đơn</h1>
          <p className="mt-1 text-navy-500">{data ? `${data.length} món` : ' '}</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden /> Thêm món
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Trạng thái món" className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              onClick={() => setStatus(t.value)}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', status === t.value ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-gray-100')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <label htmlFor="menu-search" className="sr-only">
            Tìm món
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input id="menu-search" type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tìm theo tên món..." className={cn(inputClass(), 'pl-10')} />
        </div>
        <label htmlFor="menu-category" className="sr-only">
          Danh mục
        </label>
        <select id="menu-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cn(inputClass(), 'lg:w-52')}>
          <option value="">Tất cả danh mục</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={cn('mt-6 transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-(--radius-card)" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="size-7" aria-hidden />}
            title={status === 'inactive' ? 'Không có món ngừng bán' : 'Chưa có món nào'}
            description={status === 'active' ? 'Thêm món đầu tiên để sinh viên có thể đặt.' : undefined}
            action={
              status === 'active' && (
                <Button onClick={() => setEditing('new')}>
                  <Plus className="size-4" aria-hidden /> Thêm món
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-(--radius-card) border border-gray-100 bg-white shadow-(--shadow-card)">
            {data.map((item) => (
              <li key={item.id} className={cn('flex flex-wrap items-center gap-4 p-4', !item.isActive && 'bg-gray-50')}>
                <ImageWithFallback src={item.imageUrl ?? undefined} alt="" className={cn('size-16 shrink-0 rounded-xl object-cover', !item.isActive && 'grayscale')} />
                <div className="min-w-40 flex-1">
                  <p className="font-bold">
                    {item.name}
                    {!item.isActive && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Ngừng bán</span>}
                  </p>
                  <p className="text-sm text-navy-500">
                    {item.category.name} · Đã bán {item.soldCount}
                  </p>
                  <p className="mt-0.5 font-extrabold">{formatCurrency(item.price)}</p>
                </div>

                {item.isActive && (
                  <div className="flex flex-col gap-2">
                    <Switch
                      size="sm"
                      label="Còn món"
                      checked={item.isAvailable}
                      disabled={patch.isPending}
                      onChange={(v) => patch.mutate({ id: item.id, isAvailable: v }, { onSuccess: () => toast.success(`${item.name}: ${v ? 'còn món' : 'tạm hết'}`) })}
                    />
                    <Switch size="sm" label="Đề xuất" checked={item.isFeatured} disabled={patch.isPending} onChange={(v) => patch.mutate({ id: item.id, isFeatured: v })} />
                  </div>
                )}

                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(item)} aria-label={`Sửa ${item.name}`}>
                    <Pencil className="size-4" aria-hidden /> Sửa
                  </Button>
                  {item.isActive ? (
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeactivating(item)} aria-label={`Ngừng bán ${item.name}`}>
                      <XCircle className="size-4" aria-hidden /> Ngừng bán
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch.mutate({ id: item.id, isActive: true }, { onSuccess: () => toast.success(`Đã bán lại "${item.name}"`) })}
                      aria-label={`Bán lại ${item.name}`}
                    >
                      <RotateCcw className="size-4" aria-hidden /> Bán lại
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MenuItemFormDialog stallId={stallId} item={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deactivating !== null}
        title={`Ngừng bán "${deactivating?.name}"?`}
        description="Món sẽ bị ẩn khỏi thực đơn và gỡ khỏi giỏ hàng của sinh viên. Lịch sử đơn hàng vẫn được giữ nguyên, bạn có thể bán lại bất cứ lúc nào."
        confirmLabel="Ngừng bán"
        tone="danger"
        loading={deactivate.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => deactivating && deactivate.mutate(deactivating.id)}
      />
    </div>
  );
}
