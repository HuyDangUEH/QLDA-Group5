import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState } from '@/components/ui/States';
import { inputClass } from '@/components/ui/styles';
import { PageHeader } from '@/features/admin/PageHeader';
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge';
import { ORDER_STATUS_LABELS } from '@/features/orders/order-labels';
import { VendorOrderDialog } from '@/features/vendor/VendorOrderDialog';
import { adminKeys, adminService, type AdminOrderFilters } from '@/services/admin.service';
import type { AdminOrderRow } from '@/types/admin';
import type { OrderStatus } from '@/types/models';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [stallId, setStallId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminOrderRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const stalls = useQuery({ queryKey: adminKeys.stalls, queryFn: () => adminService.stalls() });
  const filters: AdminOrderFilters = { status: status || undefined, stallId: stallId ? Number(stallId) : undefined, q: q || undefined, from: from || undefined, to: to || undefined, page, pageSize: 15 };
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: adminKeys.orders(filters),
    queryFn: () => adminService.orders(filters),
    placeholderData: keepPreviousData,
  });

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const columns: Column<AdminOrderRow>[] = [
    {
      key: 'code',
      header: 'Mã đơn',
      cell: (o) => (
        <button type="button" onClick={() => setOpen(o)} className="font-mono font-bold text-brand-600 hover:underline">
          {o.orderNumber}
        </button>
      ),
    },
    { key: 'time', header: 'Thời gian', cell: (o) => <span className="whitespace-nowrap text-navy-600">{formatDateTime(o.createdAt)}</span> },
    {
      key: 'student',
      header: 'Sinh viên',
      cell: (o) => (
        <>
          <p className="font-medium">{o.student.fullName}</p>
          <p className="text-xs text-navy-500">{o.student.email}</p>
        </>
      ),
    },
    { key: 'stall', header: 'Quầy', cell: (o) => o.stall.name },
    { key: 'total', header: 'Tổng tiền', align: 'right', cell: (o) => <span className="font-semibold tabular-nums">{formatCurrency(o.total)}</span> },
    { key: 'status', header: 'Trạng thái', cell: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Đơn hàng toàn hệ thống" description={data ? `${data.meta.total} đơn` : ' '} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_200px_150px_150px]">
        <div className="relative">
          <label htmlFor="order-q" className="sr-only">
            Tìm đơn
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input id="order-q" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Mã đơn, tên / email sinh viên..." className={cn(inputClass(), 'pl-10')} />
        </div>
        <div>
          <label htmlFor="order-status" className="sr-only">
            Trạng thái
          </label>
          <select id="order-status" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as OrderStatus | '')} className={inputClass()}>
            <option value="">Mọi trạng thái</option>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="order-stall" className="sr-only">
            Quầy
          </label>
          <select id="order-stall" value={stallId} onChange={(e) => resetPage(setStallId)(e.target.value)} className={inputClass()}>
            <option value="">Tất cả quầy</option>
            {stalls.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="order-from" className="sr-only">
            Từ ngày
          </label>
          <input id="order-from" type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} className={inputClass()} title="Từ ngày" />
        </div>
        <div>
          <label htmlFor="order-to" className="sr-only">
            Đến ngày
          </label>
          <input id="order-to" type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} className={inputClass()} title="Đến ngày" />
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <div className={cn('transition-opacity', isFetching && !isPending && 'opacity-60')}>
          <DataTable caption="Đơn hàng" columns={columns} rows={data?.items} rowKey={(o) => o.id} loading={isPending} minWidth={860} empty="Không có đơn nào phù hợp" />
          {data && data.meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination meta={data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <VendorOrderDialog mode="admin" stallId={open?.stall.id ?? 0} orderId={open?.id ?? null} onClose={() => setOpen(null)} />
    </div>
  );
}
