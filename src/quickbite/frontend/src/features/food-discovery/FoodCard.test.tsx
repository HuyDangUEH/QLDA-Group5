import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeMenuItem } from '@/test/fixtures';
import { FoodCard } from './FoodCard';

const normalize = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

describe('FoodCard', () => {
  it('hiển thị tên, giá VND, quầy, danh mục và số đã bán', () => {
    render(<FoodCard item={makeMenuItem()} onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Phở bò tái' })).toBeInTheDocument();
    expect(normalize(screen.getByText(/45\.000/).textContent)).toBe('45.000 ₫');
    expect(screen.getByText('Phở & Mì Cô Ba')).toBeInTheDocument();
    expect(screen.getByText('Bún – Phở – Mì')).toBeInTheDocument();
    expect(screen.getByText(/Đã bán 12/)).toBeInTheDocument();
  });

  it('món hết hàng có nhãn "Tạm hết" và được đọc rõ cho trình đọc màn hình', () => {
    render(<FoodCard item={makeMenuItem({ isAvailable: false, canOrder: false })} onSelect={vi.fn()} />);
    expect(screen.getByText('Tạm hết')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName(/tạm hết/);
  });

  it('ẩn tên quầy khi hideStall', () => {
    render(<FoodCard item={makeMenuItem()} onSelect={vi.fn()} hideStall />);
    expect(screen.queryByText('Phở & Mì Cô Ba')).not.toBeInTheDocument();
  });

  it('bấm vào thẻ gọi onSelect với món', async () => {
    const item = makeMenuItem();
    const onSelect = vi.fn();
    render(<FoodCard item={item} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(item);
  });
});
