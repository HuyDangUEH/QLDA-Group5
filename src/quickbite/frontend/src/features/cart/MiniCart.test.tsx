import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { cartService } from '@/services/cart.service';
import { makeCart, makeMenuItem } from '@/test/fixtures';
import { makeUser, renderRoutes } from '@/test/utils';
import { MiniCart } from './MiniCart';

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
      { path: '/', element: <MiniCart /> },
      { path: '/gio-hang', element: <p>Trang giỏ hàng</p> },
      { path: '/thanh-toan', element: <p>Trang thanh toán</p> },
    ],
    '/',
  );

const openMiniCart = async (count: number) => {
  await userEvent.click(await screen.findByRole('button', { name: `Giỏ hàng, ${count} món` }));
  return screen.getByRole('dialog', { name: 'Xem nhanh giỏ hàng' });
};

describe('MiniCart', () => {
  it('icon có số món; bấm vào mở bảng xem nhanh: món, số lượng, thành tiền, tạm tính', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart());
    render();

    const panel = await openMiniCart(2);
    expect(within(panel).getByText('Phở bò tái')).toBeInTheDocument();
    expect(within(panel).getByText(/2 × 45\.000/)).toBeInTheDocument();
    expect(within(panel).getByText('Tạm tính')).toBeInTheDocument();
    expect(within(panel).getAllByText(/90\.000/)).toHaveLength(2); // thành tiền dòng + tạm tính
  });

  it('nút "Thanh toán" chuyển tới trang thanh toán và đóng bảng', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart());
    const { router } = render();

    const panel = await openMiniCart(2);
    await userEvent.click(within(panel).getByRole('link', { name: 'Thanh toán' }));
    expect(router.state.location.pathname).toBe('/thanh-toan');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('xoá món ngay trong mini cart, giỏ cập nhật theo phản hồi API', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart());
    vi.mocked(cartService.remove).mockResolvedValue(makeCart({ items: [], itemCount: 0, subtotal: '0', stall: null }));
    render();

    const panel = await openMiniCart(2);
    await userEvent.click(within(panel).getByRole('button', { name: 'Xoá Phở bò tái' }));
    expect(cartService.remove).toHaveBeenCalledWith(10);
    expect(await within(panel).findByText('Giỏ hàng đang trống')).toBeInTheDocument();
  });

  it('món hết hàng hoặc quầy đóng cửa → hiện lý do và khoá nút Thanh toán', async () => {
    vi.mocked(cartService.get).mockResolvedValue(
      makeCart({
        items: [{ id: 10, quantity: 1, note: null, menuItem: makeMenuItem(), lineTotal: '45000', issue: 'Món này đã hết, vui lòng xoá khỏi giỏ' }],
        itemCount: 1,
        stallIssue: 'Quầy đang tạm ngưng nhận đơn',
        canCheckout: false,
      }),
    );
    render();

    const panel = await openMiniCart(1);
    expect(within(panel).getByText('Món này đã hết, vui lòng xoá khỏi giỏ')).toBeInTheDocument();
    expect(within(panel).getByRole('alert')).toHaveTextContent('Quầy đang tạm ngưng nhận đơn');
    expect(within(panel).getByRole('button', { name: 'Thanh toán' })).toBeDisabled();
  });

  it('nhiều hơn 4 món → chỉ hiện 4 dòng và báo số món còn lại', async () => {
    const items = [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, quantity: 1, note: null, menuItem: makeMenuItem({ id: i, name: `Món ${i}` }), lineTotal: '45000', issue: null }));
    vi.mocked(cartService.get).mockResolvedValue(makeCart({ items, itemCount: 6 }));
    render();

    const panel = await openMiniCart(6);
    expect(within(panel).getAllByRole('listitem')).toHaveLength(4);
    expect(within(panel).getByText('và 2 món khác trong giỏ')).toBeInTheDocument();
  });

  it('giỏ trống → gợi ý khám phá món; Esc đóng bảng', async () => {
    vi.mocked(cartService.get).mockResolvedValue(makeCart({ items: [], itemCount: 0, subtotal: '0', stall: null }));
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Giỏ hàng' }));
    expect(await screen.findByText('Giỏ hàng đang trống')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá món ăn' })).toHaveAttribute('href', '/mon-an');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
