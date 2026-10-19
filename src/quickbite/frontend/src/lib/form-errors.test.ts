import { describe, expect, it } from 'vitest';
import { safeRedirect } from './form-errors';

describe('safeRedirect', () => {
  it('chấp nhận đường dẫn nội bộ', () => {
    expect(safeRedirect('/tai-khoan', '/')).toBe('/tai-khoan');
  });

  it.each(['https://trang-xau.com', '//trang-xau.com', '/\\trang-xau.com', 'javascript:alert(1)', '', null])(
    'chặn chuyển hướng ra ngoài: %s',
    (value) => {
      expect(safeRedirect(value, '/')).toBe('/');
    },
  );
});
