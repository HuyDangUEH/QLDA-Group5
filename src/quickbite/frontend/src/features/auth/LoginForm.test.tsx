import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { makeUser, withQueryClient } from '@/test/utils';
import { LoginForm } from './LoginForm';

vi.mock('@/services/auth.service', () => ({
  authService: { login: vi.fn(), me: vi.fn() },
}));
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (msg: string) => toastError(msg), success: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('LoginForm', () => {
  it('báo lỗi khi bỏ trống, không gọi API', async () => {
    withQueryClient(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Vui lòng nhập email')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('báo lỗi email sai định dạng', async () => {
    withQueryClient(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Email/), 'khong-phai-email');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
  });

  it('đăng nhập thành công gọi onSuccess với người dùng', async () => {
    const user = makeUser();
    vi.mocked(authService.login).mockResolvedValue(user);
    const onSuccess = vi.fn();
    withQueryClient(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Email/), 'an@test.local');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'Matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(user, expect.anything(), undefined, expect.anything()));
    expect(authService.login).toHaveBeenCalledWith({ email: 'an@test.local', password: 'Matkhau123' }, expect.anything());
  });

  it('hiển thị thông báo lỗi từ server bằng toast', async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiError('Email hoặc mật khẩu không đúng', 401, 'UNAUTHORIZED'));
    withQueryClient(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/Email/), 'an@test.local');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'SaiMatKhau1');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Email hoặc mật khẩu không đúng'));
  });

  it('nút hiện/ẩn mật khẩu hoạt động', async () => {
    withQueryClient(<LoginForm onSuccess={vi.fn()} />);
    const input = screen.getByLabelText(/^Mật khẩu/);
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
