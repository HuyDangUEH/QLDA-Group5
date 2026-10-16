import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { cartService } from '@/services/cart.service';
import { makeCart, makeMenuItem } from '@/test/fixtures';
import { makeUser, renderRoutes } from '@/test/utils';
import { useAddToCartAction } from './use-add-to-cart-action';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));
vi.mock('@/services/cart.service', () => ({ cartService: { add: vi.fn(), get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const item = makeMenuItem({ id: 7, name: 'Trà sữa' });

function Harness() {
  const { handleAdd, confirmDialog } = useAddToCartAction();
  return (
    <>
      <button type="button" onClick={() => handleAdd(item, { quantity: 2, note: '' })}>
        Thêm thử
      </button>
      {confirmDialog}
    </>
  );
}

const render = () =>
  renderRoutes(
    [
      { path: '/mon-an', element: <Harness /> },
      { path: '/dang-nhap', element: <p>Trang đăng nhập</p> },
    ],
    '/mon-an',
  );

beforeEach(() => vi.clearAllMocks());

describe('useAddToCartAction', () => {
  it('khách chưa đăng nhập → chuyển tới đăng nhập kèm redirect', async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    const { router } = render();
    await waitFor(() => expect(authService.me).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'Thêm thử' }));
    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?redirect=%2Fmon-an');
    expect(cartService.add).not.toHaveBeenCalled();
  });

  it('giỏ có món quầy khác → hỏi xác nhận, đồng ý thì gửi replaceCart', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
    vi.mocked(cartService.add)
      .mockRejectedValueOnce(
        new ApiError('Giỏ hàng đang có món của quầy khác', 409, 'CART_STALL_CONFLICT', { currentStall: { id: 1, name: 'Quầy Cũ' } }),
      )
      .mockResolvedValueOnce(makeCart());
    render();
    await waitFor(() => expect(authService.me).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'Thêm thử' }));
    expect(await screen.findByText('Quầy Cũ')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xoá giỏ & thêm món' }));
    await waitFor(() => expect(cartService.add).toHaveBeenCalledTimes(2));
    expect(vi.mocked(cartService.add).mock.calls[1]![0]).toEqual({ menuItemId: 7, quantity: 2, note: undefined, replaceCart: true });
  });

  it('chủ quầy không thể thêm vào giỏ', async () => {
    vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'VENDOR' }));
    render();
    await waitFor(() => expect(authService.me).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Thêm thử' }));
    expect(cartService.add).not.toHaveBeenCalled();
  });
});
