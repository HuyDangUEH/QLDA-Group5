import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { GuestOnlyRoute } from '@/features/auth/ProtectedRoute';
import { makeUser, renderRoutes } from '@/test/utils';
import type { Role } from '@/features/auth/types';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

vi.mock('@/services/auth.service', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}));
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: (m: string) => toastSuccess(m) } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(null as never); // chưa đăng nhập
});

/** Cây route rút gọn giống ứng dụng: trang đăng nhập/đăng ký chỉ dành cho khách + trang chủ của từng vai trò */
const routes = [
  { path: '/dang-nhap', element: <GuestOnlyRoute><LoginPage /></GuestOnlyRoute> },
  { path: '/dang-ky', element: <GuestOnlyRoute><RegisterPage /></GuestOnlyRoute> },
  { path: '/', element: <p>Trang chủ sinh viên</p> },
  { path: '/quan-ly', element: <p>Trang quản lý quầy</p> },
  { path: '/quan-tri', element: <p>Trang quản trị</p> },
  { path: '/tai-khoan', element: <p>Trang hồ sơ</p> },
];

async function loginAs(role: Role, initialPath = '/dang-nhap') {
  vi.mocked(authService.login).mockResolvedValue(makeUser({ role, fullName: 'Người Dùng Thử' }));
  const view = renderRoutes(routes, initialPath);
  await userEvent.type(await screen.findByLabelText(/Email/), 'nguoi@test.local');
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'Matkhau123');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  return view;
}

describe('Đăng nhập → chuyển hướng theo vai trò', () => {
  it.each([
    ['STUDENT', '/', 'Trang chủ sinh viên'],
    ['VENDOR', '/quan-ly', 'Trang quản lý quầy'],
    ['ADMIN', '/quan-tri', 'Trang quản trị'],
  ] as const)('%s → %s', async (role, path, text) => {
    const { router } = await loginAs(role);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    expect(toastSuccess).toHaveBeenCalledWith('Chào mừng trở lại, Người Dùng Thử!');
  });

  it('có ?redirect hợp lệ → quay lại đúng trang đang xem dở (ưu tiên hơn trang mặc định)', async () => {
    const { router } = await loginAs('VENDOR', '/dang-nhap?redirect=%2Ftai-khoan');
    expect(await screen.findByText('Trang hồ sơ')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tai-khoan');
  });

  it('?redirect trỏ ra trang web ngoài → bị bỏ qua (chống open redirect)', async () => {
    const { router } = await loginAs('ADMIN', '/dang-nhap?redirect=%2F%2Ftrang-xau.example');
    expect(await screen.findByText('Trang quản trị')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/quan-tri');
  });

  it('đã đăng nhập mà mở /dang-nhap hoặc /dang-ky → tự chuyển về trang của vai trò', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'VENDOR' }));
    const { router } = renderRoutes(routes, '/dang-ky');
    expect(await screen.findByText('Trang quản lý quầy')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/quan-ly');
  });

  it('link "Đăng ký ngay" giữ lại ?redirect', async () => {
    renderRoutes(routes, '/dang-nhap?redirect=%2Fgio-hang');
    expect(await screen.findByRole('link', { name: 'Đăng ký ngay' })).toHaveAttribute('href', '/dang-ky?redirect=%2Fgio-hang');
  });
});

describe('Đăng ký → vào luôn trang chủ sinh viên', () => {
  it('đăng ký thành công → chào mừng và chuyển về trang chủ', async () => {
    vi.mocked(authService.register).mockResolvedValue(makeUser({ role: 'STUDENT', fullName: 'Trần Bình' }));
    const { router } = renderRoutes(routes, '/dang-ky');
    await userEvent.type(await screen.findByLabelText(/Họ và tên/), 'Trần Bình');
    await userEvent.type(screen.getByLabelText(/Email/), 'binh@truong.edu.vn');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'Matkhau123');
    await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'Matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(toastSuccess).toHaveBeenCalledWith('Đăng ký thành công! Chào Trần Bình 👋');
  });
});
