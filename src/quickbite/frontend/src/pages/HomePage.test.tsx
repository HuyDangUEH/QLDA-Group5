import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { catalogService } from '@/services/catalog.service';
import { makeMenuItem, makeStall } from '@/test/fixtures';
import { renderRoutes } from '@/test/utils';
import type { HomeData } from '@/types/models';
import { HomePage } from './HomePage';

vi.mock('@/services/catalog.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/catalog.service')>();
  return { ...actual, catalogService: { home: vi.fn(), menuItem: vi.fn() } };
});
vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));

const home: HomeData = {
  categories: [
    { id: 1, name: 'Cơm', slug: 'com', icon: 'utensils', description: null, itemCount: 6 },
    { id: 2, name: 'Đồ uống', slug: 'do-uong', icon: 'cup-soda', description: null, itemCount: 5 },
  ],
  featuredStalls: [makeStall({ id: 1, name: 'Bếp Nhà Sinh Viên', slug: 'bep-nha-sinh-vien' })],
  popularItems: [makeMenuItem({ id: 11, name: 'Cơm gà bowl sốt mè' })],
  featuredItems: [makeMenuItem({ id: 12, name: 'Trà sữa trân châu đường đen' })],
  promotions: [{ id: 'p1', title: 'Giảm 10% bữa sáng', description: 'Đặt trước 9h', badge: 'Ưu đãi', link: '/mon-an', imageUrl: '/images/food/pho-bo-tai.webp', tone: 'brand' }],
};

const render = () =>
  renderRoutes(
    [
      { path: '/', element: <HomePage /> },
      { path: '/mon-an', element: <p>Trang món ăn</p> },
      { path: '/quan-an', element: <p>Trang quầy ăn</p> },
    ],
    '/',
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.me).mockResolvedValue(null as never);
  vi.mocked(catalogService.home).mockResolvedValue(home);
});

describe('HomePage', () => {
  it('hiện tiêu đề lớn, thanh tìm kiếm và nút khám phá ngay cả khi dữ liệu chưa về', () => {
    vi.mocked(catalogService.home).mockReturnValue(new Promise(() => {})); // đang tải mãi
    render();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Đồ ăn ngon trong trường');
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Khám phá món ăn/ })).toHaveAttribute('href', '/mon-an');
  });

  it('hiện đủ các mục từ API: danh mục (kèm số món), quầy nổi bật, món bán chạy, gợi ý, khuyến mãi', async () => {
    render();
    const categories = await screen.findByRole('region', { name: 'Danh mục' });
    // Mỗi danh mục là link sang trang Món ăn đã lọc sẵn
    expect(await within(categories).findByRole('link', { name: /Cơm\s*6 món/ })).toHaveAttribute('href', '/mon-an?category=com');
    expect(screen.getByRole('region', { name: 'Quầy ăn nổi bật' })).toHaveTextContent('Bếp Nhà Sinh Viên');
    expect(screen.getByRole('region', { name: 'Món bán chạy' })).toHaveTextContent('Cơm gà bowl sốt mè');
    expect(screen.getByRole('region', { name: 'Gợi ý hôm nay' })).toHaveTextContent('Trà sữa trân châu đường đen');
    expect(screen.getByRole('region', { name: 'Khuyến mãi' })).toHaveTextContent('Giảm 10% bữa sáng');
  });

  it('không có món gợi ý → ẩn mục "Gợi ý hôm nay"', async () => {
    vi.mocked(catalogService.home).mockResolvedValue({ ...home, featuredItems: [] });
    render();
    await screen.findByRole('region', { name: 'Món bán chạy' });
    expect(screen.queryByRole('region', { name: 'Gợi ý hôm nay' })).not.toBeInTheDocument();
  });

  it('API lỗi → thông báo lỗi tiếng Việt, bấm "Thử lại" gọi lại API', async () => {
    vi.mocked(catalogService.home).mockRejectedValueOnce(new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.', 0, 'NETWORK_ERROR'));
    render();
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(catalogService.home).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Cơm gà bowl sốt mè')).toBeInTheDocument();
  });

  it('tìm từ thanh tìm kiếm trang chủ → sang trang Món ăn kèm từ khoá', async () => {
    const { router } = render();
    await userEvent.type(screen.getByLabelText('Tìm món ăn'), 'pho{Enter}');
    expect(await screen.findByText('Trang món ăn')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=pho');
  });

  it('hướng dẫn "Đặt món trong 3 bước" nhắc cả tiền mặt và chuyển khoản QR', () => {
    vi.mocked(catalogService.home).mockReturnValue(new Promise(() => {}));
    render();
    const steps = screen.getByRole('region', { name: 'Đặt món trong 3 bước' });
    expect(steps).toHaveTextContent('Trả tiền mặt khi nhận hoặc chuyển khoản bằng mã QR');
  });
});
