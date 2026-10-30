import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { ordersService } from '@/services/orders.service';
import { makeOrder } from '@/test/fixtures';
import { makeUser, renderRoutes } from '@/test/utils';
import { OrderDetailPage } from './OrderDetailPage';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));
vi.mock('@/services/orders.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/orders.service')>();
  return { ...actual, ordersService: { detail: vi.fn(), cancel: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
});

const render = (url = '/don-hang/42') => renderRoutes([{ path: '/don-hang/:id', element: <OrderDetailPage /> }], url);

describe('OrderDetailPage (xác nhận & chi tiết đơn)', () => {
  it('vừa đặt xong (?moi=1) → lời xác nhận "Đặt món thành công", mã đơn, món, tổng tiền, điểm nhận', async () => {
    vi.mocked(ordersService.detail).mockResolvedValue(makeOrder({ customerNote: 'Lấy giúp thêm muỗng' }));
    render('/don-hang/42?moi=1');

    expect(await screen.findByRole('status')).toHaveTextContent('Đặt món thành công!');
    expect(screen.getByRole('heading', { level: 1, name: 'QB-261016-ABCD' })).toBeInTheDocument();
    expect(screen.getByText('Phở bò tái')).toBeInTheDocument();
    expect(screen.getByText('Sảnh tòa A1')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú của bạn: Lấy giúp thêm muỗng')).toBeInTheDocument();
    expect(ordersService.detail).toHaveBeenCalledWith(42);
  });

  it('mở lại từ lịch sử (không có ?moi=1) → không hiện lời xác nhận', async () => {
    vi.mocked(ordersService.detail).mockResolvedValue(makeOrder());
    render();

    await screen.findByRole('heading', { level: 1, name: 'QB-261016-ABCD' });
    expect(screen.queryByText('Đặt món thành công! 🎉')).not.toBeInTheDocument();
  });

  it('huỷ đơn: nhập lý do → gọi API huỷ, trang cập nhật trạng thái "Đã huỷ" và lý do', async () => {
    const cancelled = makeOrder({ status: 'CANCELLED', paymentStatus: 'VOIDED', cancelReason: 'Đặt nhầm món', cancelledAt: '2026-10-16T03:05:00.000Z', canCancel: false });
    // Lần đầu đơn còn chờ xác nhận; sau khi huỷ, server trả về đơn đã huỷ
    vi.mocked(ordersService.detail).mockResolvedValueOnce(makeOrder()).mockResolvedValue(cancelled);
    vi.mocked(ordersService.cancel).mockResolvedValue(cancelled);
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ đơn hàng' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Lý do/), 'Đặt nhầm món');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ đơn' }));

    expect(ordersService.cancel).toHaveBeenCalledWith(42, 'Đặt nhầm món');
    expect(await screen.findByText('Lý do: Đặt nhầm món')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Huỷ đơn hàng' })).not.toBeInTheDocument();
  });

  it('quầy đã nhận đơn (canCancel = false) → không có nút huỷ', async () => {
    vi.mocked(ordersService.detail).mockResolvedValue(makeOrder({ status: 'ACCEPTED', canCancel: false }));
    render();

    await screen.findByRole('heading', { level: 1, name: 'QB-261016-ABCD' });
    expect(screen.queryByRole('button', { name: 'Huỷ đơn hàng' })).not.toBeInTheDocument();
  });

  it('đơn không tồn tại hoặc của người khác (404) → trang "Không tìm thấy trang"', async () => {
    vi.mocked(ordersService.detail).mockRejectedValue(new ApiError('Không tìm thấy đơn hàng', 404, 'NOT_FOUND'));
    render('/don-hang/999');

    expect(await screen.findByText('Không tìm thấy trang')).toBeInTheDocument();
  });
});
