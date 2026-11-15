import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShiftRevenue as Shift } from '@/types/vendor';
import { ShiftRevenue } from './ShiftRevenue';

const shift = (key: Shift['key'], label: string, start: string, end: string, orders: number, completed: number, revenue: string): Shift => ({
  key, label, start, end, orders, completed, revenue,
});

const shifts: Shift[] = [
  shift('morning', 'Ca sáng', '06:00', '11:00', 4, 4, '150000'),
  shift('noon', 'Ca trưa', '11:00', '14:00', 10, 9, '450000'),
  shift('afternoon', 'Ca chiều', '14:00', '18:00', 0, 0, '0'),
  shift('evening', 'Ca tối', '18:00', '22:00', 3, 2, '100000'),
];

describe('ShiftRevenue (doanh thu theo ca)', () => {
  it('mỗi ca một dòng: khung giờ, doanh thu, tỉ trọng, số đơn hoàn thành / tổng', () => {
    render(<ShiftRevenue shifts={shifts} />);
    const rows = within(screen.getByRole('list', { name: 'Doanh thu từng ca' })).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('Ca trưa');
    expect(rows[1]).toHaveTextContent('11:00 – 14:00');
    expect(rows[1]).toHaveTextContent(/450\.000/);
    expect(rows[1]).toHaveTextContent('64%'); // 450.000 / 700.000
    expect(rows[1]).toHaveTextContent('9/10 đơn');
    expect(rows[2]).toHaveTextContent('0%');
  });

  it('nêu ca có doanh thu cao nhất', () => {
    render(<ShiftRevenue shifts={shifts} />);
    expect(screen.getByText(/Ca doanh thu cao nhất/)).toHaveTextContent('Ca doanh thu cao nhất: Ca trưa');
  });

  it('chưa có doanh thu → không nêu ca cao nhất, tỉ trọng 0%', () => {
    render(<ShiftRevenue shifts={shifts.map((s) => ({ ...s, revenue: '0', completed: 0 }))} />);
    expect(screen.queryByText(/Ca doanh thu cao nhất/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/· 0%/)).toHaveLength(4);
  });

  it('có đơn ngoài giờ → thêm dòng "Ngoài giờ"', () => {
    render(<ShiftRevenue shifts={[...shifts, shift('other', 'Ngoài giờ', '22:00', '06:00', 1, 1, '30000')]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Ngoài giờ')).toBeInTheDocument();
  });
});
