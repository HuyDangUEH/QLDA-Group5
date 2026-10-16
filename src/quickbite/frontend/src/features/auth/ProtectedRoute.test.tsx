import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { makeUser, renderRoutes } from '@/test/utils';
import { GuestOnlyRoute, ProtectedRoute } from './ProtectedRoute';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));

const routes = [
  { path: '/dang-nhap', element: <p>Trang đăng nhập</p> },
  {
    path: '/quan-tri',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <p>Nội dung quản trị</p>
      </ProtectedRoute>
    ),
  },
];

beforeEach(() => vi.clearAllMocks());

describe('ProtectedRoute', () => {
  it('chưa đăng nhập → chuyển tới trang đăng nhập kèm redirect', async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    const { router } = renderRoutes(routes, '/quan-tri');

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dang-nhap');
    expect(router.state.location.search).toBe('?redirect=%2Fquan-tri');
  });

  it('sai vai trò → hiển thị trang 403', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
    renderRoutes(routes, '/quan-tri');

    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
    expect(screen.queryByText('Nội dung quản trị')).not.toBeInTheDocument();
  });

  it('trang khách: đã đăng nhập thì chuyển tới ?redirect hợp lệ', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'ADMIN' }));
    const { router } = renderRoutes(
      [
        { path: '/dang-nhap', element: <GuestOnlyRoute><p>Form đăng nhập</p></GuestOnlyRoute> },
        { path: '/quan-tri', element: <p>Nội dung quản trị</p> },
      ],
      '/dang-nhap?redirect=%2Fquan-tri',
    );
    expect(await screen.findByText('Nội dung quản trị')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/quan-tri');
  });

  it('trang khách: redirect ra ngoài bị bỏ qua, về trang mặc định của vai trò', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'VENDOR' }));
    const { router } = renderRoutes(
      [
        { path: '/dang-nhap', element: <GuestOnlyRoute><p>Form đăng nhập</p></GuestOnlyRoute> },
        { path: '/quan-ly', element: <p>Trang chủ quầy</p> },
      ],
      '/dang-nhap?redirect=https%3A%2F%2Ftrang-xau.com',
    );
    expect(await screen.findByText('Trang chủ quầy')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/quan-ly');
  });

  it('đúng vai trò → hiển thị nội dung', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'ADMIN' }));
    renderRoutes(routes, '/quan-tri');
    expect(await screen.findByText('Nội dung quản trị')).toBeInTheDocument();
  });
});
