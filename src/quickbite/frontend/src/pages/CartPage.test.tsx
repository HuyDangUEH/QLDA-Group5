import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { cartService } from '@/services/cart.service';
import { makeCart } from '@/test/fixtures';
import { makeUser, renderRoutes } from '@/test/utils';
import { CartPage } from './CartPage';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));
vi.mock('@/services/cart.service', () => ({
  cartService: { get: vi.fn(), update: vi.fn(), remove: vi.fn(), clear: vi.fn(), add: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
});

const render = () =>
  renderRoutes(
    [
      { path: '/gio-hang', element: <CartPage /> },
      { path: '/thanh-toan', element: <p>Trang thanh toán</p> },
    ],
    '/gio-hang',
  );

describe('CartPage', () => {
  it('hiển thị món, ghi chú, tạm tính và cho phép thanh toán', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart());
    const { router } = render();

    expect(await screen.findByRole('heading', { name: 'Phở bò tái' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ít hành')).toBeInTheDocument();
    expect(screen.getByText('Tạm tính (2 phần)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Tiến hành đặt món/ }));
    expect(router.state.location.pathname).toBe('/thanh-toan');
  });

  it('tăng số lượng gọi API cập nhật và hiển thị giỏ mới', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart());
    vi.mocked(cartService.update).mockResolvedValue(
      makeCart({ items: [{ ...makeCart().items[0]!, quantity: 3, lineTotal: '135000' }], itemCount: 3, subtotal: '135000' }),
    );
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Tăng số lượng' }));
    expect(cartService.update).toHaveBeenCalledWith(10, { quantity: 3 });
    await waitFor(() => expect(screen.getByText('Tạm tính (3 phần)')).toBeInTheDocument());
  });

  it('xoá món khỏi giỏ', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart());
    vi.mocked(cartService.remove).mockResolvedValue(makeCart({ items: [], itemCount: 0, subtotal: '0', stall: null }));
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Xoá Phở bò tái khỏi giỏ' }));
    expect(await screen.findByText('Giỏ hàng đang trống')).toBeInTheDocument();
  });

  it('món hết hàng hoặc quầy đóng cửa → cảnh báo và khoá nút thanh toán', async () => {
    vi.mocked(cartService.get).mockResolvedValue(
      makeCart({
        items: [{ ...makeCart().items[0]!, issue: 'Món này đã hết, vui lòng xoá khỏi giỏ' }],
        stallIssue: 'Quầy hiện đã đóng cửa (mở cửa 06:00 – 20:00)',
        canCheckout: false,
      }),
    );
    render();

    expect(await screen.findByText(/Món này đã hết/)).toBeInTheDocument();
    expect(screen.getByText(/Quầy hiện đã đóng cửa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiến hành đặt món/ })).toBeDisabled();
  });

  it('giỏ trống → gợi ý khám phá món', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart({ items: [], itemCount: 0, subtotal: '0', stall: null }));
    render();
    expect(await screen.findByText('Giỏ hàng đang trống')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá món ăn' })).toHaveAttribute('href', '/mon-an');
  });
});
