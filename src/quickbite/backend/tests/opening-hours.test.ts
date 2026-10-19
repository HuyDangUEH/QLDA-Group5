import { describe, expect, it } from 'vitest';
import { campusMinutesOfDay, isWithinOpeningHours } from '../src/utils/opening-hours.js';

// 2026-10-16T03:30:00Z = 10:30 giờ Việt Nam (UTC+7)
const at = (hhmmVN: string) => {
  const [h, m] = hhmmVN.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 16, h! - 7, m!));
};

describe('giờ mở cửa (giờ Việt Nam)', () => {
  it('đổi đúng sang giờ Việt Nam', () => {
    expect(campusMinutesOfDay(new Date('2026-10-16T03:30:00Z'))).toBe(10 * 60 + 30);
  });

  it('trong và ngoài khung giờ thường', () => {
    expect(isWithinOpeningHours('07:00', '20:00', at('10:30'))).toBe(true);
    expect(isWithinOpeningHours('07:00', '20:00', at('07:00'))).toBe(true);
    expect(isWithinOpeningHours('07:00', '20:00', at('20:00'))).toBe(false);
    expect(isWithinOpeningHours('07:00', '20:00', at('06:59'))).toBe(false);
  });

  it('khung giờ qua nửa đêm', () => {
    expect(isWithinOpeningHours('18:00', '02:00', at('23:00'))).toBe(true);
    expect(isWithinOpeningHours('18:00', '02:00', at('01:30'))).toBe(true);
    expect(isWithinOpeningHours('18:00', '02:00', at('12:00'))).toBe(false);
  });
});
