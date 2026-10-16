import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { buttonClass } from '@/components/ui/styles';

export function ForbiddenPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ShieldAlert className="size-8" aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold text-red-600">Lỗi 403</p>
      <h1 className="mt-1 text-3xl font-extrabold">Không có quyền truy cập</h1>
      <p className="mt-3 text-navy-500">Tài khoản của bạn không được phép xem trang này.</p>
      <Link to="/" className={buttonClass({ className: 'mt-8' })}>
        Về trang chủ
      </Link>
    </section>
  );
}
