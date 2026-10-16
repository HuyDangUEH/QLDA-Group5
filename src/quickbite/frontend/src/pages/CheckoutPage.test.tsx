import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { cartService } from '@/services/cart.service';
import { ordersService } from '@/services/orders.service';
import { makeCart, makeOrder } from '@/test/fixtures';
import { makeUser, renderRoutes } from '@/test/utils';
import { CheckoutPage } from './CheckoutPage';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));
vi.mock('@/services/cart.service', () => ({ cartService: { get: vi.fn() } }));
vi.mock('@/services/orders.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/orders.service')>();
  return { ...actual, ordersService: { pickupLocations: vi.fn(), create: vi.fn() } };
});
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
  vi.mocked(cartService.get).mockResolvedValue(makeCart());
  vi.mocked(ordersService.pickupLocations).mockResolvedValue([
    { id: 1, name: 'Sảnh tòa A1', building: null, description: 'Tầng trệt' },
    { id: 2, name: 'Thư viện', building: null, description: null },
  ]);
});

const render = () =>
  renderRoutes(
    [
      { path: '/thanh-toan', element: <CheckoutPage /> },
      { path: '/gio-hang', element: <p>Trang giỏ hàng</p> },
      { path: '/don-hang/:id', element: <p>Trang chi tiết đơn</p> },
    ],
    '/thanh-toan',
  );

describe('CheckoutPage', () => {
  it('bắt buộc chọn điểm nhận', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Đặt món' }));
    expect(await screen.findByText('Vui lòng chọn điểm nhận món')).toBeInTheDocument();
    expect(ordersService.create).not.toHaveBeenCalled();
  });

  it('gửi đúng dữ liệu (kèm idempotencyKey) và chuyển tới trang xác nhận', async () => {
    vi.mocked(ordersService.create).mockResolvedValue({ order: makeOrder({ id: 42 }), created: true });
    const { router } = render();

    await userEvent.click(await screen.findByRole('radio', { name: /Thư viện/ }));
    await userEvent.selectOptions(screen.getByLabelText('Giờ nhận món'), '2026-10-16T03:45:00.000Z');
    await userEvent.type(screen.getByLabelText(/Ghi chú cho quầy/), 'Gọi mình nhé');
    await userEvent.click(screen.getByRole('button', { name: 'Đặt món' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/don-hang/42'));
    expect(router.state.location.search).toBe('?moi=1');

    const payload = vi.mocked(ordersService.create).mock.calls[0]![0];
    expect(payload).toEqual({
      pickupLocationId: 2,
      pickupTime: '2026-10-16T03:45:00.000Z',
      customerNote: 'Gọi mình nhé',
      paymentMethod: 'CASH_ON_PICKUP',
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it('bấm đặt lại sau lỗi dùng CÙNG idempotencyKey (không tạo đơn trùng)', async () => {
    vi.mocked(ordersService.create).mockRejectedValueOnce(new ApiError('Lỗi mạng', 0, 'NETWORK_ERROR'));
    vi.mocked(ordersService.create).mockResolvedValueOnce({ order: makeOrder(), created: false });
    render();

    await userEvent.click(await screen.findByRole('radio', { name: /Sảnh tòa A1/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Đặt món' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Lỗi mạng'));
    await userEvent.click(screen.getByRole('button', { name: 'Đặt món' }));

    await waitFor(() => expect(ordersService.create).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(ordersService.create).mock.calls;
    expect(first![0].idempotencyKey).toBe(second![0].idempotencyKey);
  });

  it('chỉ có phương thức tiền mặt, ghi rõ chưa hỗ trợ thanh toán online', async () => {
    render();
    expect(await screen.findByText('Tiền mặt khi nhận món')).toBeInTheDocument();
    expect(screen.getByText(/chưa được hỗ trợ/)).toBeInTheDocument();
  });

  it('giỏ không thể thanh toán → quay về trang giỏ', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart({ canCheckout: false }));
    render();
    expect(await screen.findByText('Trang giỏ hàng')).toBeInTheDocument();
  });
});
