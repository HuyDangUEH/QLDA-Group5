import { describe, expect, it } from 'vitest';
import { durationToMs, signSessionToken, verifySessionToken } from '../src/lib/jwt.js';

describe('durationToMs', () => {
  it('đổi đúng các đơn vị', () => {
    expect(durationToMs('45s')).toBe(45_000);
    expect(durationToMs('30m')).toBe(1_800_000);
    expect(durationToMs('12h')).toBe(43_200_000);
    expect(durationToMs('7d')).toBe(604_800_000);
  });

  it('báo lỗi với định dạng sai', () => {
    expect(() => durationToMs('7 ngày')).toThrow();
  });
});

describe('JWT phiên đăng nhập', () => {
  it('ký và xác minh được token', () => {
    const token = signSessionToken({ sub: 42, role: 'VENDOR', tv: 3 });
    expect(verifySessionToken(token)).toEqual({ sub: 42, role: 'VENDOR', tv: 3 });
  });

  it('token bị sửa nội dung không hợp lệ', () => {
    const token = signSessionToken({ sub: 1, role: 'STUDENT', tv: 0 });
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '1', role: 'ADMIN', tv: 0, iss: 'quickbite-api' })).toString('base64url');
    expect(verifySessionToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });
});
