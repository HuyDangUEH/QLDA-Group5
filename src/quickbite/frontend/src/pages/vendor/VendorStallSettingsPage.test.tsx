import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ordersService } from '@/services/orders.service';
import { vendorService } from '@/services/vendor.service';
import { VendorStallContext, type VendorStallContextValue } from '@/features/vendor/vendor-stall-context';
import { renderRoutes } from '@/test/utils';
import type { VendorStall, VendorStallDetail } from '@/types/vendor';
import { VendorStallSettingsPage } from './VendorStallSettingsPage';

vi.mock('@/services/vendor.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/vendor.service')>();
  return { ...actual, vendorService: { stall: vi.fn(), updateStall: vi.fn() } };
});
vi.mock('@/services/orders.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/orders.service')>();
  return { ...actual, ordersService: { banks: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const stall: VendorStall = {
  id: 7,
  name: 'Bếp Nhà Sinh Viên',
  slug: 'bep-nha-sinh-vien',
  description: 'Cơm nhà nấu',
  imageUrl: null,
  location: 'Căn tin tòa A',
  phone: '0283800001',
  openTime: '06:30',
  closeTime: '20:00',
  isActive: true,
  isAcceptingOrders: true,
  isOpenNow: true,
  canOrderNow: true,
  bankBin: null,
  bankAccountNo: null,
  bankAccountName: null,
  acceptsVietQr: false,
  paymentTimeoutMinutes: 15,
  createdAt: '2026-10-16T00:00:00Z',
  updatedAt: '2026-10-16T00:00:00Z',
};
const detail = (role: VendorStallDetail['myRole'] = 'OWNER'): VendorStallDetail => ({
  stall: { ...stall, memberships: [], _count: { menuItems: 5, orders: 9 } },
  myRole: role,
});
const ctx: VendorStallContextValue = {
  stalls: [stall],
  stall,
  stallId: 7,
  setStallId: vi.fn(),
  isPending: false,
  error: null,
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(vendorService.stall).mockResolvedValue(detail());
  // Như server thật: sau khi lưu, tải lại quầy sẽ có updatedAt mới (form được dựng lại)
  vi.mocked(vendorService.updateStall).mockImplementation(async () => {
    vi.mocked(vendorService.stall).mockResolvedValue({
      ...detail(),
      stall: { ...detail().stall, updatedAt: new Date().toISOString() },
    });
    return stall;
  });
  vi.mocked(ordersService.banks).mockResolvedValue([]);
});

const render = () =>
  renderRoutes(
    [
      {
        path: '/quan-ly/thong-tin-quay',
        element: (
          <VendorStallContext.Provider value={ctx}>
            <VendorStallSettingsPage />
          </VendorStallContext.Provider>
        ),
      },
    ],
    '/quan-ly/thong-tin-quay',
  );

/** UAT-Q02: sau khi lưu phải biết rõ đã lưu */
describe('VendorStallSettingsPage — xác nhận sau khi lưu thông tin quầy', () => {
  it('đang sửa → báo "Có thay đổi chưa lưu"; lưu xong → thông báo cố định "Đã lưu lúc HH:mm", nút thành "Đã lưu"', async () => {
    render();
    const phone = await screen.findByLabelText('Số điện thoại');
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();

    await userEvent.clear(phone);
    await userEvent.type(phone, '0909123456');
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() =>
      expect(vendorService.updateStall).toHaveBeenCalledWith(7, expect.objectContaining({ phone: '0909123456' })),
    );
    const saved = await screen.findByRole('status');
    expect(saved).toHaveTextContent(/^Đã lưu lúc \d{2}:\d{2}$/);
    expect(screen.queryByText('Có thay đổi chưa lưu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đã lưu' })).toBeDisabled();
    expect(toast.success).toHaveBeenCalledWith('Đã lưu thông tin quầy', {
      description: 'Sinh viên sẽ thấy thông tin mới ngay trên trang quầy.',
    });
  });

  it('sửa tiếp sau khi lưu → thông báo "Đã lưu" ẩn, nút trở lại "Lưu thay đổi"', async () => {
    render();
    const phone = await screen.findByLabelText('Số điện thoại');
    await userEvent.type(phone, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByRole('status');

    // Form đã được dựng lại sau khi lưu → lấy lại ô nhập mới
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '8');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  });

  it('lưu lỗi → không báo đã lưu', async () => {
    vi.mocked(vendorService.updateStall).mockRejectedValue(new Error('Mất kết nối'));
    render();
    const phone = await screen.findByLabelText('Số điện thoại');
    await userEvent.type(phone, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(vendorService.updateStall).toHaveBeenCalled());
    expect(screen.queryByText(/Đã lưu lúc/)).not.toBeInTheDocument();
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
  });
});
