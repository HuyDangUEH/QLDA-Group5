import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { makeUser, withQueryClient } from '@/test/utils';
import { RegisterForm } from './RegisterForm';

vi.mock('@/services/auth.service', () => ({
  authService: { register: vi.fn(), me: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

async function fillValid() {
  await userEvent.type(screen.getByLabelText(/Họ và tên/), 'Nguyễn Văn An');
  await userEvent.type(screen.getByLabelText(/Email/), 'an@truong.edu.vn');
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'Matkhau123');
  await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'Matkhau123');
}

describe('RegisterForm', () => {
  it('bỏ trống → báo lỗi tiếng Việt từng ô, không gọi API', async () => {
    withQueryClient(<RegisterForm onSuccess={vi.fn()} />);
    await submit();
    expect(await screen.findByText('Họ tên phải có ít nhất 2 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập email')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu phải có ít nhất 8 ký tự')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('mật khẩu thiếu chữ số và nhập lại không khớp → báo lỗi', async () => {
    withQueryClient(<RegisterForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'chuacoso');
    await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'khac');
    await submit();
    expect(await screen.findByText('Mật khẩu phải có ít nhất 1 chữ số')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
  });

  it('số điện thoại / mã sinh viên không bắt buộc nhưng nhập thì phải đúng', async () => {
    withQueryClient(<RegisterForm onSuccess={vi.fn()} />);
    await fillValid();
    await userEvent.type(screen.getByLabelText(/Số điện thoại/), '123');
    await submit();
    expect(await screen.findByText('Số điện thoại không hợp lệ (vd: 0901234567)')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('hợp lệ → gửi đúng dữ liệu (không gửi "nhập lại mật khẩu"), gọi onSuccess', async () => {
    const user = makeUser({ fullName: 'Nguyễn Văn An' });
    vi.mocked(authService.register).mockResolvedValue(user);
    const onSuccess = vi.fn();
    withQueryClient(<RegisterForm onSuccess={onSuccess} />);
    await fillValid();
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0]).toEqual(user);
    expect(vi.mocked(authService.register).mock.calls[0]![0]).toEqual({
      fullName: 'Nguyễn Văn An',
      email: 'an@truong.edu.vn',
      password: 'Matkhau123',
      phone: '',
      studentCode: '',
    });
  });

  it('email đã đăng ký (409 từ server) → lỗi hiện ngay dưới ô Email', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new ApiError('Email này đã được đăng ký', 409, 'CONFLICT', [{ field: 'email', message: 'Email này đã được đăng ký' }]),
    );
    withQueryClient(<RegisterForm onSuccess={vi.fn()} />);
    await fillValid();
    await submit();
    expect(await screen.findByText('Email này đã được đăng ký')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
  });
});
