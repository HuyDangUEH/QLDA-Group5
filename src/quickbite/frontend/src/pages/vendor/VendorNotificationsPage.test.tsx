import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { notificationsService } from '@/services/notifications.service';
import { VendorStallContext, type VendorStallContextValue } from '@/features/vendor/vendor-stall-context';
import { makeUser, renderRoutes } from '@/test/utils';
import type { AppNotification, VendorStall } from '@/types/vendor';
import { VendorNotificationsPage } from './VendorNotificationsPage';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));
vi.mock('@/services/notifications.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/notifications.service')>();
  return { ...actual, notificationsService: { list: vi.fn(), unreadCount: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const stall = { id: 7, name: 'Bếp Nhà Sinh Viên' } as VendorStall;
const ctx: VendorStallContextValue = { stalls: [stall], stall, stallId: 7, setStallId: vi.fn(), isPending: false, error: null, refetch: vi.fn() };
const note = (id: number, title: string, isRead: boolean): AppNotification => ({
  id, type: 'ORDER_STATUS', title, message: '2 phần — tổng 70.000đ. Vui lòng xác nhận.', isRead, createdAt: '2026-11-15T03:00:00.000Z', orderId: 100 + id,
  order: { id: 100 + id, orderNumber: `QB-261115-00${id}`, stallId: 7 },
});
const meta = { page: 1, pageSize: 15, total: 2, totalPages: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(makeUser({ role: 'VENDOR' }));
  vi.mocked(notificationsService.list).mockResolvedValue({ items: [note(1, 'Đơn mới: QB-261115-001', false), note(2, 'Đơn QB-261115-002 đã bị huỷ', true)], meta });
  vi.mocked(notificationsService.unreadCount).mockResolvedValue(1);
  vi.mocked(notificationsService.markRead).mockResolvedValue({ id: 1 });
  vi.mocked(notificationsService.markAllRead).mockResolvedValue({ updated: 1 });
});

const render = () =>
  renderRoutes(
    [
      { path: '/quan-ly/thong-bao', element: <VendorStallContext.Provider value={ctx}><VendorNotificationsPage /></VendorStallContext.Provider> },
      { path: '/quan-ly/don-hang', element: <p>Trang đơn hàng</p> },
    ],
    '/quan-ly/thong-bao',
  );

describe('VendorNotificationsPage (thông báo của quầy)', () => {
  it('chỉ lấy thông báo của quầy đang chọn; hiện tên quầy và số chưa đọc', async () => {
    render();
    expect(await screen.findByText('Đơn mới: QB-261115-001')).toBeInTheDocument();
    expect(notificationsService.list).toHaveBeenCalledWith({ page: 1, pageSize: 15, unread: false, stallId: 7 });
    expect(notificationsService.unreadCount).toHaveBeenCalledWith(7);
    expect(screen.getByText(/Bếp Nhà Sinh Viên/)).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Chưa đọc (1)' })).toBeInTheDocument();
  });

  it('tab "Chưa đọc" → lọc chưa đọc của quầy', async () => {
    render();
    await userEvent.click(await screen.findByRole('tab', { name: /Chưa đọc/ }));
    await waitFor(() => expect(notificationsService.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 15, unread: true, stallId: 7 }));
  });

  it('bấm thông báo → đánh dấu đã đọc và mở đơn trong trang Đơn hàng', async () => {
    const { router } = render();
    await userEvent.click(await screen.findByRole('button', { name: /Đơn mới: QB-261115-001/ }));
    expect(notificationsService.markRead).toHaveBeenCalledWith(1);
    await waitFor(() => expect(router.state.location.pathname).toBe('/quan-ly/don-hang'));
    expect(router.state.location.search).toBe('?order=101&quay=7');
  });

  it('"Đánh dấu tất cả đã đọc" chỉ áp dụng cho quầy đang chọn', async () => {
    render();
    await screen.findByText('Đơn mới: QB-261115-001');
    await userEvent.click(await screen.findByRole('button', { name: /Đánh dấu tất cả đã đọc/ }));
    await waitFor(() => expect(notificationsService.markAllRead).toHaveBeenCalledWith(7));
  });

  it('quầy chưa có thông báo → trạng thái trống', async () => {
    vi.mocked(notificationsService.list).mockResolvedValue({ items: [], meta: { ...meta, total: 0, totalPages: 0 } });
    vi.mocked(notificationsService.unreadCount).mockResolvedValue(0);
    render();
    expect(await screen.findByText('Quầy chưa có thông báo nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/ })).toBeDisabled();
  });
});
