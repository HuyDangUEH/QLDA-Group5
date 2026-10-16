import { screen, waitFor } from '@testing-library/react';
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
});
