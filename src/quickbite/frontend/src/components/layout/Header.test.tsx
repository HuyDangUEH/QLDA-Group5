import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { LoginForm } from '@/features/auth/LoginForm';
import { makeUser, renderRoutes } from '@/test/utils';
import { Header } from './Header';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn(), login: vi.fn(), logout: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

const page = (
  <>
    <Header />
    <LoginForm onSuccess={() => {}} />
  </>
);

describe('Header', () => {
  it('khách: hiện nút Đăng nhập / Đăng ký, không có menu quản trị', async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    renderRoutes([{ path: '/', element: <Header /> }], '/');

    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' });
    expect(await screen.findByRole('link', { name: 'Đăng ký' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /Quản trị/ })).not.toBeInTheDocument();
  });

  it('cập nhật ngay sau khi đăng nhập (admin thấy menu Quản trị)', async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    vi.mocked(authService.login).mockResolvedValue(makeUser({ role: 'ADMIN', fullName: 'Quản Trị Viên' }));
    renderRoutes([{ path: '/', element: page }], '/');

    await screen.findByRole('link', { name: 'Đăng ký' });
    await userEvent.type(screen.getByLabelText(/Email/), 'admin@test.local');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'Matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Quản Trị Viên')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: /Quản trị/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Đăng ký' })).not.toBeInTheDocument();
  });

  it('sinh viên không thấy menu Quản lý quầy / Quản trị', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
    renderRoutes([{ path: '/', element: <Header /> }], '/');

    await screen.findByText('Nguyễn Văn An');
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).queryByRole('link', { name: /Quản lý quầy|Quản trị/ })).not.toBeInTheDocument();
  });
});
