import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogService } from '@/services/catalog.service';
import { makeMenuItem } from '@/test/fixtures';
import { renderRoutes } from '@/test/utils';
import { FoodDiscoveryPage } from './FoodDiscoveryPage';

vi.mock('@/services/catalog.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/catalog.service')>();
  return {
    ...actual,
    catalogService: { categories: vi.fn(), stalls: vi.fn(), menuItems: vi.fn() },
  };
});

const meta = (total: number) => ({ page: 1, pageSize: 12, total, totalPages: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(catalogService.categories).mockResolvedValue([
    { id: 1, name: 'Đồ uống', slug: 'do-uong', icon: null, description: null, itemCount: 3 },
  ]);
  vi.mocked(catalogService.stalls).mockResolvedValue([]);
  vi.mocked(catalogService.menuItems).mockResolvedValue({ items: [makeMenuItem()], meta: meta(1) });
});

const render = (path = '/mon-an') => renderRoutes([{ path: '/mon-an', element: <FoodDiscoveryPage /> }], path);

describe('FoodDiscoveryPage', () => {
  it('đọc bộ lọc từ URL và gửi đúng tham số tới API', async () => {
    render('/mon-an?q=pho&category=do-uong&price=30-50&available=true&sort=price_asc&page=2');
    await screen.findByRole('heading', { name: 'Phở bò tái' });

    expect(catalogService.menuItems).toHaveBeenCalledWith({
      q: 'pho',
      category: 'do-uong',
      stall: undefined,
      minPrice: 30001,
      maxPrice: 50000,
      available: true,
      sort: 'price_asc',
      page: 2,
      pageSize: 12,
    });
  });

  it('bấm danh mục cập nhật URL và quay về trang 1', async () => {
    const { router } = render('/mon-an?page=3');
    await screen.findByRole('heading', { name: 'Phở bò tái' });

    const [categoryButton] = await screen.findAllByRole('button', { name: 'Đồ uống' });
    await userEvent.click(categoryButton!);

    await waitFor(() => expect(router.state.location.search).toBe('?category=do-uong'));
    expect(screen.getAllByRole('button', { name: 'Đồ uống' })[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('gõ tìm kiếm cập nhật URL sau khi ngừng gõ', async () => {
    const { router } = render();
    await screen.findByRole('heading', { name: 'Phở bò tái' });

    const [searchInput] = screen.getAllByPlaceholderText('Tên món, mô tả...');
    await userEvent.type(searchInput!, 'tra sua');
    await waitFor(() => expect(router.state.location.search).toBe('?q=tra+sua'), { timeout: 2000 });
  });

  it('không có kết quả: hiện trạng thái rỗng và nút xoá bộ lọc', async () => {
    vi.mocked(catalogService.menuItems).mockResolvedValue({ items: [], meta: meta(0) });
    const { router } = render('/mon-an?q=khongco');

    expect(await screen.findByText('Không tìm thấy món phù hợp')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('lỗi API: hiện thông báo lỗi và nút thử lại', async () => {
    vi.mocked(catalogService.menuItems).mockRejectedValue(new Error('Không kết nối được máy chủ'));
    render();
    expect(await screen.findByText('Không kết nối được máy chủ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  // ─── UAT-SV01: tải danh sách món khi mạng yếu ───
  it('đổi bộ lọc khi đang tải lại → hiện rõ "Đang tải món..." (không chỉ làm mờ)', async () => {
    const { router } = render();
    await screen.findByRole('heading', { name: 'Phở bò tái' });
    let release!: () => void;
    vi.mocked(catalogService.menuItems).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ items: [makeMenuItem()], meta: meta(1) });
        }),
    );
    const [categoryButton] = await screen.findAllByRole('button', { name: 'Đồ uống' });
    await userEvent.click(categoryButton!);
    await waitFor(() => expect(router.state.location.search).toBe('?category=do-uong'));
    expect(await screen.findByRole('status')).toHaveTextContent('Đang tải món...');
    release();
    await waitFor(() => expect(screen.queryByText('Đang tải món...')).not.toBeInTheDocument());
  });

  it('tải sẵn trang kế tiếp để bấm "Trang sau" có ngay dữ liệu', async () => {
    vi.mocked(catalogService.menuItems).mockResolvedValue({
      items: [makeMenuItem()],
      meta: { page: 1, pageSize: 12, total: 30, totalPages: 3 },
    });
    render();
    await screen.findByRole('heading', { name: 'Phở bò tái' });
    await waitFor(() => expect(catalogService.menuItems).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('4 ảnh món đầu danh sách tải ngay, các ảnh sau tải lười', async () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      makeMenuItem({ id: i + 1, name: `Món ${i + 1}`, imageUrl: `/images/food/${i + 1}.webp` }),
    );
    vi.mocked(catalogService.menuItems).mockResolvedValue({ items, meta: meta(6) });
    const { container } = render();
    await screen.findByRole('heading', { name: 'Món 1' });
    const loading = [...container.querySelectorAll('img')].map((img) => img.getAttribute('loading'));
    expect(loading).toEqual(['eager', 'eager', 'eager', 'eager', 'lazy', 'lazy']);
  });

  // ─── UAT-SV02: bộ lọc gọn trên điện thoại ───
  it('điện thoại: bộ lọc mở trong bảng trượt, có nút "Xem N món" và "Xoá bộ lọc"; không bung sẵn trên trang', async () => {
    vi.mocked(catalogService.menuItems).mockResolvedValue({ items: [makeMenuItem()], meta: meta(17) });
    render();
    await screen.findByRole('heading', { name: 'Phở bò tái' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Bộ lọc/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Bộ lọc món ăn' });
    expect(within(sheet).getByPlaceholderText('Tên món, mô tả...')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Xoá bộ lọc' })).toBeDisabled();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Xem 17 món' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('điện thoại: bộ lọc đang chọn hiện thành chip gọn, bấm × để bỏ từng bộ lọc', async () => {
    const { router } = render('/mon-an?category=do-uong&price=0-30&available=true');
    await screen.findByRole('heading', { name: 'Phở bò tái' });
    const chips = screen.getByRole('list', { name: 'Bộ lọc đang áp dụng' });
    expect(
      within(chips)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Đồ uống', 'Từ 30.000đ trở xuống', 'Còn hàng']);
    expect(screen.getByRole('button', { name: 'Bộ lọc (3)' })).toBeInTheDocument();

    await userEvent.click(within(chips).getByRole('button', { name: 'Bỏ bộ lọc Từ 30.000đ trở xuống' }));
    await waitFor(() => expect(router.state.location.search).toBe('?category=do-uong&available=true'));
  });
});
