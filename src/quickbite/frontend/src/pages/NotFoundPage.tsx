import { Link } from 'react-router';
import { SearchX } from 'lucide-react';
import { buttonClass } from '@/components/ui/styles';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <SearchX className="size-8" aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold text-brand-600">Lỗi 404</p>
      <h1 className="mt-1 text-3xl font-extrabold">Không tìm thấy trang</h1>
      <p className="mt-3 text-navy-500">Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
      <Link to="/" className={buttonClass({ className: 'mt-8' })}>
        Về trang chủ
      </Link>
    </section>
  );
}
