import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ordersService } from '@/services/orders.service';
import { makeOrder } from '@/test/fixtures';
import { withQueryClient } from '@/test/utils';
import { OrderReviewCard } from './ReviewForm';

vi.mock('@/services/orders.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/orders.service')>();
  return { ...actual, ordersService: { review: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('OrderReviewCard', () => {
  it('đơn chưa hoàn thành → không hiện form đánh giá', () => {
    const { container } = withQueryClient(<OrderReviewCard order={makeOrder({ status: 'PREPARING' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('bắt buộc chọn số sao, rồi gửi đúng dữ liệu', async () => {
    vi.mocked(ordersService.review).mockResolvedValue({ id: 1, rating: 4, comment: 'Ngon', createdAt: '2026-10-16T00:00:00Z' });
    withQueryClient(<OrderReviewCard order={makeOrder({ status: 'COMPLETED' })} />);

    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
    expect(await screen.findByText('Vui lòng chọn số sao')).toBeInTheDocument();
    expect(ordersService.review).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('radio', { name: /4 sao/ }));
    await userEvent.type(screen.getByLabelText(/Nhận xét/), '  Ngon  ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
    await waitFor(() => expect(ordersService.review).toHaveBeenCalledWith(42, { rating: 4, comment: 'Ngon' }));
  });

  it('đã đánh giá → hiển thị lại đánh giá, không hiện form', () => {
    withQueryClient(
      <OrderReviewCard order={makeOrder({ status: 'COMPLETED', review: { id: 1, rating: 5, comment: 'Tuyệt vời', createdAt: '2026-10-16T00:00:00Z' } })} />,
    );
    expect(screen.getByText('Đánh giá của bạn')).toBeInTheDocument();
    expect(screen.getByText('Tuyệt vời')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).not.toBeInTheDocument();
  });
});
