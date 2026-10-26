import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { catalogService } from '@/services/catalog.service';
import { makeMenuItem } from '@/test/fixtures';
import { renderRoutes } from '@/test/utils';
import { FoodDetailPage } from './FoodDetailPage';

vi.mock('@/services/catalog.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/catalog.service')>();
  return { ...actual, catalogService: { menuItem: vi.fn() } };
});
vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));

const stall = { id: 1, name: 'Bếp Nhà Sinh Viên', slug: 'bep-nha-sinh-vien', isOpenNow: true, location: 'Căn tin tòa A' };
const item = makeMenuItem({ id: 3, name: 'Cơm gà bowl sốt mè', description: 'Ức gà áp chảo, trứng lòng đào.', price: '42000', stall });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(null as never);
  vi.mocked(catalogService.menuItem).mockResolvedValue({ item, related: [makeMenuItem({ id: 4, name: 'Cơm chiên Dương Châu', stall })] });
});

const render = (id: string | number = 3) =>
  renderRoutes(
    [
      { path: '/mon-an/:id', element: <FoodDetailPage /> },
      { path: '/mon-an', element: <p>Trang món ăn</p> },
    ],
    `/mon-an/${id}`,
  );

describe('FoodDetailPage (trang chi tiết món)', () => {
  it('hiện tên, mô tả, giá, quầy, vị trí và nút thêm vào giỏ', async () => {
    render();
    expect(await screen.findByRole('heading', { level: 1, name: 'Cơm gà bowl sốt mè' })).toBeInTheDocument();
    expect(screen.getByText('Ức gà áp chảo, trứng lòng đào.')).toBeInTheDocument();
    expect(screen.getAllByText(/42\.000/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Bếp Nhà Sinh Viên/ })).toHaveAttribute('href', '/quan-an/bep-nha-sinh-vien');
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeInTheDocument();
    expect(catalogService.menuItem).toHaveBeenCalledWith(3);
  });

  it('có mục "Món khác của quầy" kèm link xem cả quầy', async () => {
    render();
    expect(await screen.findByText('Món khác của Bếp Nhà Sinh Viên')).toBeInTheDocument();
    expect(screen.getByText('Cơm chiên Dương Châu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem cả quầy/ })).toHaveAttribute('href', '/quan-an/bep-nha-sinh-vien');
  });

  it('món không tồn tại (404) hoặc ID sai → trang "Không tìm thấy trang", không gọi API với ID sai', async () => {
    vi.mocked(catalogService.menuItem).mockRejectedValue(new ApiError('Không tìm thấy món ăn', 404, 'NOT_FOUND'));
    render(999999);
    expect(await screen.findByText('Không tìm thấy trang')).toBeInTheDocument();

    vi.mocked(catalogService.menuItem).mockClear();
    render('abc');
    expect(await screen.findAllByText('Không tìm thấy trang')).not.toHaveLength(0);
    expect(catalogService.menuItem).not.toHaveBeenCalled();
  });
});
