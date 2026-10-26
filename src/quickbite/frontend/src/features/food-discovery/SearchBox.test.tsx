import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoutes } from '@/test/utils';
import { SearchBox } from './SearchBox';

const render = () =>
  renderRoutes(
    [
      { path: '/', element: <SearchBox /> },
      { path: '/mon-an', element: <p>Trang món ăn</p> },
    ],
    '/',
  );

describe('SearchBox (thanh tìm kiếm trang chủ)', () => {
  it('có vai trò "search" và nhãn cho trình đọc màn hình', () => {
    render();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText('Tìm món ăn')).toHaveAttribute('placeholder', 'Hôm nay bạn muốn ăn gì? Phở, cơm chiên, trà sữa...');
  });

  it('gõ từ khoá có dấu rồi bấm "Tìm" → sang /mon-an?q=… (đã mã hoá URL, bỏ khoảng trắng thừa)', async () => {
    const { router } = render();
    await userEvent.type(screen.getByLabelText('Tìm món ăn'), '  phở bò  ');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(await screen.findByText('Trang món ăn')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/mon-an');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('phở bò');
  });

  it('nhấn Enter cũng tìm được', async () => {
    const { router } = render();
    await userEvent.type(screen.getByLabelText('Tìm món ăn'), 'tra sua{Enter}');
    expect(await screen.findByText('Trang món ăn')).toBeInTheDocument();
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('tra sua');
  });

  it('để trống mà bấm Tìm → mở trang Món ăn không kèm từ khoá', async () => {
    const { router } = render();
    await userEvent.type(screen.getByLabelText('Tìm món ăn'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(await screen.findByText('Trang món ăn')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });
});
