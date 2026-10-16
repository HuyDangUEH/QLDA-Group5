import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { FullPageSpinner } from '@/components/ui/States';
import { Header } from './Header';
import { Logo } from './Logo';

const CURRENT_YEAR = new Date().getFullYear();

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Bỏ qua tới nội dung chính
      </a>
      {/* Cuộn lên đầu khi chuyển trang, giữ vị trí cũ khi bấm Back */}
      <ScrollRestoration />
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="bg-navy-900 py-8 text-sm text-navy-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo light />
          <p>© {CURRENT_YEAR} QuickBite — Đặt món nhanh trong khuôn viên trường.</p>
        </div>
      </footer>
    </div>
  );
}
