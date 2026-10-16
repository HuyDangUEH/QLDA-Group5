import type { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router';
import { FullPageSpinner } from '@/components/ui/States';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { safeRedirect } from '@/lib/form-errors';
import { useCurrentUser } from './hooks';
import { ROLE_HOME, type Role } from './types';

/**
 * Bảo vệ route ở giao diện: chưa đăng nhập → chuyển tới trang đăng nhập, sai vai trò → trang 403.
 * Lưu ý: đây chỉ là trải nghiệm người dùng. Quyền thật sự luôn được backend kiểm tra.
 */
export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/dang-nhap?redirect=${redirect}`} replace />;
  }

  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;

  return <>{children}</>;
}

/**
 * Trang chỉ dành cho khách (đăng nhập, đăng ký). Khi đã đăng nhập (kể cả ngay sau khi vừa đăng nhập xong)
 * thì chuyển tới ?redirect=... nếu hợp lệ, nếu không thì về trang mặc định của vai trò.
 */
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const [params] = useSearchParams();
  if (isPending) return <FullPageSpinner />;
  if (user) return <Navigate to={safeRedirect(params.get('redirect'), ROLE_HOME[user.role])} replace />;
  return <>{children}</>;
}
