import { describe, expect, it } from 'vitest';
import { cn, formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('định dạng chuỗi decimal từ API thành VND', () => {
    expect(formatCurrency('35000.00').replace(/\s/g, ' ')).toBe('35.000 ₫');
  });
});

describe('cn', () => {
  it('class sau ghi đè class Tailwind xung đột', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
