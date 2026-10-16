import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ClipboardList, LayoutDashboard, Settings, Store, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { EmptyState, ErrorState, FullPageSpinner, Spinner } from '@/components/ui/States';
import { inputClass } from '@/components/ui/styles';
import { StallStatusBadge } from '@/features/food-discovery/badges';
import { VendorStallProvider } from '@/features/vendor/VendorStallContext';
import { useVendorStall } from '@/features/vendor/vendor-stall-context';
import { toApiError } from '@/lib/api-client';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/quan-ly', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/quan-ly/don-hang', label: 'Đơn hàng', icon: ClipboardList, badge: true },
  { to: '/quan-ly/thuc-don', label: 'Thực đơn', icon: UtensilsCrossed },
  { to: '/quan-ly/bao-cao', label: 'Báo cáo', icon: BarChart3 },
  { to: '/quan-ly/thong-tin-quay', label: 'Thông tin quầy', icon: Settings },
];

export function VendorLayout() {
  return (
    <VendorStallProvider>
      <VendorShell />
    </VendorStallProvider>
  );
}

function VendorShell() {
  const { stalls, stall, setStallId, isPending, error, refetch } = useVendorStall();
  const queryClient = useQueryClient();

  // Số đơn mới chờ xác nhận → hiện trên menu, làm mới mỗi 20 giây
  const dashboard = useQuery({
    queryKey: vendorKeys.dashboard(stall?.id ?? 0),
    queryFn: () => vendorService.dashboard(stall!.id),
    enabled: !!stall,
    refetchInterval: 20_000,
  });
  const pending = dashboard.data?.queue.pending ?? 0;

  const toggleAccepting = useMutation({
    mutationFn: (value: boolean) => vendorService.setAcceptingOrders(stall!.id, value),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.stalls });
      toast.success(updated.isAcceptingOrders ? 'Đã mở nhận đơn' : 'Đã tạm ngưng nhận đơn');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (isPending) return <FullPageSpinner />;
  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={error.message} onRetry={refetch} />
      </div>
    );
  if (!stall) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState
          icon={<Store className="size-7" aria-hidden />}
          title="Bạn chưa được gán vào quầy nào"
          description="Liên hệ quản trị viên để được phân công quản lý quầy."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-8">
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-(--radius-card) border border-gray-100 bg-white p-4 shadow-(--shadow-card)">
          {stalls.length > 1 ? (
            <>
              <label htmlFor="stall-switcher" className="text-xs font-medium text-navy-500">
                Quầy đang quản lý
              </label>
              <select id="stall-switcher" value={stall.id} onChange={(e) => setStallId(Number(e.target.value))} className={cn(inputClass(), 'mt-1 h-10 font-semibold')}>
                {stalls.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-navy-500">Quầy đang quản lý</p>
              <p className="mt-0.5 font-bold">{stall.name}</p>
            </>
          )}
          <StallStatusBadge isOpenNow={stall.isOpenNow} canOrderNow={stall.canOrderNow} className="mt-3" />
          <div className="mt-3 border-t border-gray-100 pt-3">
            <Switch
              label="Nhận đơn mới"
              checked={stall.isAcceptingOrders}
              disabled={toggleAccepting.isPending}
              onChange={(value) => toggleAccepting.mutate(value)}
            />
          </div>
        </div>

        <nav aria-label="Quản lý quầy">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {NAV.map(({ to, label, icon: Icon, end, badge }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                      isActive ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-gray-100 hover:bg-gray-50 lg:bg-transparent lg:ring-0',
                    )
                  }
                >
                  <Icon className="size-4.5" aria-hidden />
                  {label}
                  {badge && pending > 0 && (
                    <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${pending} đơn mới`}>
                      {pending}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        {/* Suspense riêng: chuyển tab chỉ hiện loading ở phần nội dung, giữ nguyên thanh bên */}
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
