import { describe, expect, it } from 'vitest';
import { generateOrderNumber } from '../src/utils/order-number.js';

describe('generateOrderNumber', () => {
  it('tạo mã theo định dạng QB-YYMMDD-XXXX', () => {
    const code = generateOrderNumber(new Date(2026, 9, 16));
    expect(code).toMatch(/^QB-261016-[2-9A-HJKMNP-Z]{4}$/);
  });

  it('không chứa ký tự dễ nhầm lẫn', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderNumber().slice(-4)).not.toMatch(/[01OIL]/);
    }
  });
});
