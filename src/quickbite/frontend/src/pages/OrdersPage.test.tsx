import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { ordersService } from '@/services/orders.service';
import { makeUser, renderRoutes } from '@/test/utils';
import type { OrderSummary } from '@/types/models';
import { OrdersPage } from './OrdersPage';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));
vi.mock('@/services/orders.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/orders.service')>();
  return { ...actual, ordersService: { list: vi.fn() } };
});

const summary = (overrides: Partial<OrderSummary> = {}): OrderSummary => ({
  id: 42,
  orderNumber: 'QB-261016-ABCD',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  total: '90000',
  pickupTime: null,
  createdAt: '2026-10-16T03:00:00.000Z',
  stall: { id: 1, name: 'Phở & Mì Cô Ba', slug: 'pho-mi-co-ba', imageUrl: null },
  pickupLocation: { id: 1, name: 'Căn tin cơ sở B' },
  items: [{ itemName: 'Phở bò tái', quantity: 2 }],
  itemCount: 2,
  ...overrides,
});
const meta = (total: number, page = 1) => ({ page, pageSize: 10, total, totalPages: Math.ceil(total / 10) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'STUDENT' }));
});

const render = (url = '/don-hang') =>
  renderRoutes(
    [
      { path: '/don-hang', element: <OrdersPage /> },
      { path: '/don-hang/:id', element: <p>Trang chi tiết đơn</p> },
    ],
    url,
  );

describe('OrdersPage (lịch sử đơn)', () => {
  it('hiện danh sách đơn: quầy, món, mã đơn, trạng thái, tổng tiền; bấm vào mở chi tiết', async () => {
    vi.mocked(ordersService.list).mockResolvedValue({ orders: [summary()], meta: meta(1) });
    const { router } = render();

    expect(await screen.findByText('Phở & Mì Cô Ba')).toBeInTheDocument();
    expect(screen.getByText('2× Phở bò tái')).toBeInTheDocument();
    expect(screen.getByText('QB-261016-ABCD')).toBeInTheDocument();
    expect(screen.getByText('Chờ quầy xác nhận')).toBeInTheDocument();
    expect(screen.getByText(/90\.000/)).toBeInTheDocument();
    expect(ordersService.list).toHaveBeenCalledWith({ group: undefined, page: 1, pageSize: 10 });

    await userEvent.click(screen.getByRole('link', { name: /QB-261016-ABCD/ }));
    expect(router.state.location.pathname).toBe('/don-hang/42');
  });

  it('bấm tab "Đã huỷ" → lọc theo nhóm, ghi lên URL (?nhom=cancelled)', async () => {
    vi.mocked(ordersService.list).mockResolvedValue({ orders: [summary()], meta: meta(1) });
    const { router } = render();

    await screen.findByText('Phở & Mì Cô Ba');
    vi.mocked(ordersService.list).mockResolvedValue({ orders: [summary({ id: 7, status: 'CANCELLED', orderNumber: 'QB-261016-HUY1' })], meta: meta(1) });
    await userEvent.click(screen.getByRole('tab', { name: 'Đã huỷ' }));

    expect(await screen.findByText('QB-261016-HUY1')).toBeInTheDocument();
    expect(ordersService.list).toHaveBeenLastCalledWith({ group: 'cancelled', page: 1, pageSize: 10 });
    expect(router.state.location.search).toBe('?nhom=cancelled');
    expect(screen.getByRole('tab', { name: 'Đã huỷ' })).toHaveAttribute('aria-selected', 'true');
  });

  it('nhiều trang → có phân trang, sang trang 2 gọi lại API', async () => {
    vi.mocked(ordersService.list).mockResolvedValue({ orders: [summary()], meta: meta(25) });
    render();

    await screen.findByText('Phở & Mì Cô Ba');
    await userEvent.click(screen.getByRole('button', { name: /Sau/ }));
    expect(ordersService.list).toHaveBeenLastCalledWith({ group: undefined, page: 2, pageSize: 10 });
  });

  it('chưa có đơn → gợi ý khám phá món', async () => {
    vi.mocked(ordersService.list).mockResolvedValue({ orders: [], meta: meta(0) });
    render();

    expect(await screen.findByText('Bạn chưa có đơn hàng nào')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá món ăn' })).toHaveAttribute('href', '/mon-an');
  });
});
