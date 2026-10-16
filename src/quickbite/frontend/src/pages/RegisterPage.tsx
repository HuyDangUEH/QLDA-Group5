import { Link } from 'react-router';
import { toast } from 'sonner';
import { AuthShell } from '@/features/auth/AuthShell';
import { RegisterForm } from '@/features/auth/RegisterForm';

/** Sau khi đăng ký, GuestOnlyRoute tự chuyển tới ?redirect=... hoặc trang chủ */
export function RegisterPage() {
  return (
    <AuthShell
      title="Tạo tài khoản sinh viên"
      subtitle={
        <>
          Đã có tài khoản?{' '}
          <Link to="/dang-nhap" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterForm onSuccess={(user) => toast.success(`Đăng ký thành công! Chào ${user.fullName} 👋`)} />
    </AuthShell>
  );
}
