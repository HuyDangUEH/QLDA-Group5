import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, History, LayoutDashboard, MapPin, MessageSquareWarning, Store, Tags, Users } from 'lucide-react';
import { Spinner } from '@/components/ui/States';
import { adminKeys, adminService } from '@/services/admin.service';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/quan-tri', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/quan-tri/nguoi-dung', label: 'Người dùng', icon: Users },
  { to: '/quan-tri/quay-an', label: 'Quầy ăn', icon: Store },
  { to: '/quan-tri/danh-muc', label: 'Danh mục', icon: Tags },
  { to: '/quan-tri/diem-nhan', label: 'Điểm nhận món', icon: MapPin },
  { to: '/quan-tri/don-hang', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/quan-tri/danh-gia', label: 'Đánh giá', icon: MessageSquareWarning, badge: true },
  { to: '/quan-tri/nhat-ky', label: 'Nhật ký', icon: History },
];

/** Khung trang quản trị: menu bên trái (máy tính) / thanh cuộn ngang (điện thoại) */
export function AdminLayout() {
  // Số đánh giá bị báo cáo cần kiểm duyệt
  const { data } = useQuery({ queryKey: adminKeys.dashboard, queryFn: adminService.dashboard, refetchInterval: 60_000 });
  const reported = data?.reportedReviews ?? 0;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:py-8">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 hidden px-3 text-xs font-bold tracking-wider text-navy-400 uppercase lg:block">Quản trị hệ thống</p>
        <nav aria-label="Quản trị">
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
                  {badge && reported > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${reported} đánh giá bị báo cáo`}>
                      {reported}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
