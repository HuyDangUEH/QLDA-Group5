import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeMenuItem } from '@/test/fixtures';
import { renderRoutes } from '@/test/utils';
import { FoodDetailContent } from './FoodDetailContent';

const renderDetail = (ui: React.ReactNode) => renderRoutes([{ path: '/', element: ui }], '/');

describe('FoodDetailContent', () => {
  it('tăng giảm số lượng trong giới hạn và cập nhật tổng tiền', async () => {
    const onAdd = vi.fn();
    renderDetail(<FoodDetailContent item={makeMenuItem({ price: '30000' })} onAddToCart={onAdd} />);

    const decrease = screen.getByRole('button', { name: 'Giảm số lượng' });
    expect(decrease).toBeDisabled(); // không thể nhỏ hơn 1

    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toHaveTextContent(/90\.000/);

    await userEvent.type(screen.getByLabelText(/Ghi chú cho quầy/), '  ít cay  ');
    await userEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }));
    expect(onAdd).toHaveBeenCalledWith({ quantity: 3, note: 'ít cay' });
  });

  it('món hết hàng: hiện lý do, không có nút thêm vào giỏ', () => {
    renderDetail(<FoodDetailContent item={makeMenuItem({ isAvailable: false, canOrder: false })} onAddToCart={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Món này tạm hết');
    expect(screen.queryByRole('button', { name: /Thêm vào giỏ/ })).not.toBeInTheDocument();
  });

  it('quầy đóng cửa: báo đã đóng cửa', () => {
    renderDetail(
      <FoodDetailContent
        item={makeMenuItem({ canOrder: false, stall: { id: 1, name: 'Quầy A', slug: 'quay-a', isOpenNow: false } })}
        onAddToCart={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('đã đóng cửa');
  });

  it('có link tới trang quầy', () => {
    renderDetail(<FoodDetailContent item={makeMenuItem()} />);
    expect(screen.getByRole('link', { name: /Phở & Mì Cô Ba/ })).toHaveAttribute('href', '/quan-an/pho-mi-co-ba');
  });

  it('hiển thị định lượng khi quầy đã nhập; ẩn dòng định lượng khi chưa có', () => {
    const { unmount } = renderDetail(<FoodDetailContent item={makeMenuItem({ portion: '1 tô · 650ml' })} onAddToCart={vi.fn()} />);
    expect(screen.getByText('1 tô · 650ml')).toBeInTheDocument();
    expect(screen.getByText(/Định lượng:/)).toBeInTheDocument();
    unmount();
    renderDetail(<FoodDetailContent item={makeMenuItem({ portion: null })} onAddToCart={vi.fn()} />);
    expect(screen.queryByText(/Định lượng:/)).not.toBeInTheDocument();
  });

  it('dạng trang riêng: tên món là tiêu đề cấp 1; trong hộp thoại: cấp 3', () => {
    const { unmount } = renderDetail(<FoodDetailContent item={makeMenuItem({ name: 'Phở bò tái' })} layout="page" onAddToCart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Phở bò tái' })).toBeInTheDocument();
    unmount();
    renderDetail(<FoodDetailContent item={makeMenuItem({ name: 'Phở bò tái' })} layout="dialog" onAddToCart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Phở bò tái' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
