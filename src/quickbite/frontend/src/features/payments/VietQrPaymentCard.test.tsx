import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VietQrInfo } from '@/types/models';
import { VietQrPaymentCard } from './VietQrPaymentCard';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR') } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const info = (overrides: Partial<VietQrInfo> = {}): VietQrInfo => ({
  bankBin: '970436',
  bankShortName: 'Vietcombank',
  bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
  accountNo: '1023456789',
  accountName: 'BEP NHA SINH VIEN',
  amount: '70000',
  content: 'QB2610204F7K',
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  paidAt: null,
  confirmedBy: null,
  qrPayload: '00020101021238...6304ABCD',
  ...overrides,
});

afterEach(() => vi.useRealTimers());

describe('VietQrPaymentCard', () => {
  it('hiện mã QR, tài khoản, số tiền, nội dung chuyển khoản và thời gian còn lại', async () => {
    render(<VietQrPaymentCard info={info()} orderNumber="QB-261020-4F7K" />);
    expect(await screen.findByRole('img', { name: /Mã VietQR chuyển 70\.000/ })).toHaveAttribute('src', 'data:image/png;base64,QR');
    expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    expect(screen.getByText('1023456789')).toBeInTheDocument();
    expect(screen.getAllByText('QB2610204F7K').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Còn (09|10):\d\d để thanh toán/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lưu ảnh mã QR/ })).toHaveAttribute('download', 'VietQR-QB-261020-4F7K.png');
    expect(screen.getByRole('button', { name: 'Sao chép nội dung' })).toBeInTheDocument();
  });

  it('hết hạn: báo giao dịch bị huỷ, không cho lưu ảnh QR, báo trang cha tải lại đúng 1 lần', async () => {
    const onExpired = vi.fn();
    const { rerender } = render(<VietQrPaymentCard info={info({ expiresAt: new Date(Date.now() - 1000).toISOString() })} orderNumber="QB-1" onExpired={onExpired} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Đã hết thời gian thanh toán, giao dịch này bị huỷ');
    rerender(<VietQrPaymentCard info={info({ expiresAt: new Date(Date.now() - 1000).toISOString() })} orderNumber="QB-1" onExpired={onExpired} />);
    expect(onExpired).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('link', { name: /Lưu ảnh mã QR/ })).not.toBeInTheDocument());
  });
});
