import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';

export interface SessionPayload {
  /** ID người dùng */
  sub: number;
  role: Role;
  /** tokenVersion tại thời điểm cấp token; lệch với DB nghĩa là token đã bị thu hồi */
  tv: number;
}

const ISSUER = 'quickbite-api';

/** Đổi chuỗi thời hạn ("7d", "12h", "30m", "45s") sang mili giây */
export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Thời hạn không hợp lệ: ${value}`);
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return Number(match[1]) * units[match[2] as keyof typeof units];
}

export const SESSION_MAX_AGE_MS = durationToMs(env.JWT_EXPIRES_IN);

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign({ role: payload.role, tv: payload.tv }, env.JWT_SECRET, {
    subject: String(payload.sub),
    issuer: ISSUER,
    algorithm: 'HS256',
    expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

/** Trả về payload nếu token hợp lệ, ngược lại trả về null (hết hạn, sai chữ ký...) */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub) return null;
    const sub = Number(decoded.sub);
    if (!Number.isInteger(sub)) return null;
    return { sub, role: decoded.role as Role, tv: Number(decoded.tv) };
  } catch {
    return null;
  }
}
