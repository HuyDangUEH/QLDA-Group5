import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogService } from '@/services/catalog.service';
import { makeStall } from '@/test/fixtures';
import { renderRoutes } from '@/test/utils';
import { StallsPage } from './StallsPage';

vi.mock('@/services/catalog.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/catalog.service')>();
  return { ...actual, catalogService: { stalls: vi.fn() } };
});

const stalls = [
  makeStall({ id: 1, name: 'Bếp Nhà Sinh Viên', slug: 'bep-nha-sinh-vien', location: 'Căn tin tòa A' }),
  makeStall({ id: 2, name: 'Phở & Mì Cô Ba', slug: 'pho-mi-co-ba', isOpenNow: false, canOrderNow: false }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(catalogService.stalls).mockImplementation(async (q?: string) => (q ? stalls.filter((s) => s.slug.includes('bep')) : stalls));
});

const render = () => renderRoutes([{ path: '/quan-an', element: <StallsPage /> }], '/quan-an');

describe('StallsPage (trang Quầy ăn)', () => {
  it('hiện danh sách quầy, mỗi quầy có link tới trang chi tiết và trạng thái mở cửa', async () => {
    render();
    expect(await screen.findByText('Bếp Nhà Sinh Viên')).toBeInTheDocument();
    expect(screen.getByText('Phở & Mì Cô Ba')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bếp Nhà Sinh Viên/ })).toHaveAttribute('href', '/quan-an/bep-nha-sinh-vien');
    expect(screen.getByText('Đã đóng cửa')).toBeInTheDocument();
  });

  it('gõ tìm kiếm → gọi API với từ khoá sau khi ngừng gõ', async () => {
    render();
    await screen.findByText('Bếp Nhà Sinh Viên');
    await userEvent.type(screen.getByPlaceholderText('Tìm theo tên, vị trí...'), 'bep');
    await waitFor(() => expect(catalogService.stalls).toHaveBeenLastCalledWith('bep'));
    await waitFor(() => expect(screen.queryByText('Phở & Mì Cô Ba')).not.toBeInTheDocument());
  });

  it('không có kết quả → thông báo tiếng Việt', async () => {
    vi.mocked(catalogService.stalls).mockResolvedValue([]);
    render();
    expect(await screen.findByText('Không tìm thấy quầy nào')).toBeInTheDocument();
  });
});
