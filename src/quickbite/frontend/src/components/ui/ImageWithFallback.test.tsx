import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageWithFallback } from './ImageWithFallback';

/** UAT-SV01: mạng yếu → ảnh đang tải phải có khung chờ, không để ô trống */
describe('ImageWithFallback (ảnh có khung chờ khi mạng yếu)', () => {
  it('đang tải: hiện khung nhấp nháy; tải xong: bỏ khung', () => {
    render(<ImageWithFallback src="/images/food/pho.webp" alt="Phở" className="size-full" />);
    const img = screen.getByRole('img', { name: 'Phở' });
    expect(img).toHaveClass('animate-pulse', 'bg-gray-200');
    expect(img).not.toHaveAttribute('data-loaded');

    fireEvent.load(img);
    expect(img).not.toHaveClass('animate-pulse');
    expect(img).toHaveAttribute('data-loaded', 'true');
    expect(img).toHaveClass('size-full');
  });

  it('ảnh thường tải lười (lazy); ảnh đầu trang (priority) tải ngay với ưu tiên cao', () => {
    const { rerender } = render(<ImageWithFallback src="/a.webp" alt="A" />);
    expect(screen.getByRole('img', { name: 'A' })).toHaveAttribute('loading', 'lazy');

    rerender(<ImageWithFallback src="/a.webp" alt="A" priority />);
    const img = screen.getByRole('img', { name: 'A' });
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('đổi sang ảnh khác → hiện lại khung chờ cho ảnh mới', () => {
    const { rerender } = render(<ImageWithFallback src="/a.webp" alt="Món" />);
    fireEvent.load(screen.getByRole('img', { name: 'Món' }));
    rerender(<ImageWithFallback src="/b.webp" alt="Món" />);
    expect(screen.getByRole('img', { name: 'Món' })).toHaveClass('animate-pulse');
  });

  it('ảnh lỗi hoặc không có ảnh → khung dự phòng', () => {
    render(<ImageWithFallback src="/hong.webp" alt="Bún" />);
    fireEvent.error(screen.getByRole('img', { name: 'Bún' }));
    expect(screen.getByRole('img', { name: 'Bún' }).tagName).toBe('DIV');
  });
});
