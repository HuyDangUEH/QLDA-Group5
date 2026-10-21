import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vendorService } from '@/services/vendor.service';
import { makeOrder } from '@/test/fixtures';
import { withQueryClient } from '@/test/utils';
import { OrderActions } from './order-actions';

vi.mock('@/services/vendor.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/vendor.service')>();
  return { ...actual, vendorService: { updateOrderStatus: vi.fn(), confirmPayment: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(vendorService.updateOrderStatus).mockResolvedValue({ ...makeOrder({ status: 'ACCEPTED' }), nextStatuses: ['PREPARING'] });
});

describe('OrderActions', () => {
  it('hiển thị đúng nút theo các trạng thái tiếp theo do server trả về', () => {
    withQueryClient(<OrderActions stallId={1} orderId={42} orderNumber="QB-1" nextStatuses={['ACCEPTED', 'REJECTED']} />);
    expect(screen.getByRole('button', { name: 'Nhận đơn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đã giao & thu tiền' })).not.toBeInTheDocument();
  });

  it('đơn đã kết thúc → không có nút nào', () => {
    const { container } = withQueryClient(<OrderActions stallId={1} orderId={42} orderNumber="QB-1" nextStatuses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('bấm "Nhận đơn" gọi API chuyển sang ACCEPTED', async () => {
    withQueryClient(<OrderActions stallId={7} orderId={42} orderNumber="QB-1" nextStatuses={['ACCEPTED', 'REJECTED']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nhận đơn' }));
    await waitFor(() => expect(vendorService.updateOrderStatus).toHaveBeenCalledWith(7, 42, 'ACCEPTED', undefined));
  });

  it('từ chối đơn bắt buộc nhập lý do', async () => {
    withQueryClient(<OrderActions stallId={7} orderId={42} orderNumber="QB-1" nextStatuses={['ACCEPTED', 'REJECTED']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Từ chối' }));

    const confirm = await screen.findAllByRole('button', { name: 'Từ chối' });
    await userEvent.click(confirm.at(-1)!);
    expect(await screen.findByText('Vui lòng nhập lý do')).toBeInTheDocument();
    expect(vendorService.updateOrderStatus).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Lý do/), 'Hết nguyên liệu');
    await userEvent.click(screen.getAllByRole('button', { name: 'Từ chối' }).at(-1)!);
    await waitFor(() => expect(vendorService.updateOrderStatus).toHaveBeenCalledWith(7, 42, 'REJECTED', 'Hết nguyên liệu'));
  });

  it('đơn chuyển khoản chưa có tiền: nút "Đã nhận tiền" hỏi xác nhận rồi gọi API', async () => {
    vi.mocked(vendorService.confirmPayment).mockResolvedValue({ ...makeOrder({ paymentMethod: 'VIETQR', paymentStatus: 'PAID' }), nextStatuses: ['ACCEPTED', 'REJECTED'] });
    withQueryClient(
      <OrderActions
        stallId={3}
        orderId={42}
        orderNumber="QB-261020-4F7K"
        nextStatuses={['REJECTED']}
        payment={{ method: 'VIETQR', awaitingPayment: true, total: '70000' }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Nhận đơn' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đã nhận tiền' }));
    expect(await screen.findByText(/nội dung QB2610204F7K/)).toBeInTheDocument();
    const dialogButtons = screen.getAllByRole('button', { name: 'Đã nhận tiền' });
    await userEvent.click(dialogButtons[dialogButtons.length - 1]!);
    await waitFor(() => expect(vendorService.confirmPayment).toHaveBeenCalledWith(3, 42));
  });

  it('đơn đã chuyển khoản: bước cuối là "Đã giao món" (không thu tiền)', () => {
    withQueryClient(
      <OrderActions stallId={1} orderId={42} orderNumber="QB-1" nextStatuses={['COMPLETED']} payment={{ method: 'VIETQR', awaitingPayment: false, total: '70000' }} />,
    );
    expect(screen.getByRole('button', { name: 'Đã giao món' })).toBeInTheDocument();
  });
});
