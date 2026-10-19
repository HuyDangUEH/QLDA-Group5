import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AuthShell } from '@/features/auth/AuthShell';
import { LoginForm } from '@/features/auth/LoginForm';

/** Sau khi đăng nhập, GuestOnlyRoute tự chuyển tới ?redirect=... hoặc trang mặc định theo vai trò */
export function LoginPage() {
  const [params] = useSearchParams();
  const redirect = params.get('redirect');

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle={
        <>
          Chưa có tài khoản?{' '}
          <Link to={`/dang-ky${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-semibold text-brand-600 hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <LoginForm onSuccess={(user) => toast.success(`Chào mừng trở lại, ${user.fullName}!`)} />
    </AuthShell>
  );
}
