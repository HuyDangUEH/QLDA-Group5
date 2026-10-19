import request from 'supertest';
import type { AccountStatus, Role, VendorRole } from '@prisma/client';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';

export const app = createApp();
export const API = '/api/v1';
export const TEST_PASSWORD = 'Matkhau123';

const TABLES = [
  'audit_logs',
  'notifications',
  'reviews',
  'payments',
  'order_status_history',
  'order_items',
  'orders',
  'cart_items',
  'carts',
  'menu_items',
  'vendor_memberships',
  'food_stalls',
  'food_categories',
  'pickup_locations',
  'users',
];

/** Xoá sạch dữ liệu database TEST (đã được setup-env.ts kiểm tra tên kết thúc bằng _test) */
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0'),
    ...TABLES.map((t) => prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``)),
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1'),
  ]);
}

// Hash một lần để test chạy nhanh
let cachedHash: string | undefined;

let seq = 0;
export async function createUser(opts: { role?: Role; status?: AccountStatus; email?: string; fullName?: string } = {}) {
  cachedHash ??= await hashPassword(TEST_PASSWORD);
  seq++;
  return prisma.user.create({
    data: {
      fullName: opts.fullName ?? `Người dùng ${seq}`,
      email: opts.email ?? `user${seq}@test.local`,
      passwordHash: cachedHash,
      role: opts.role ?? 'STUDENT',
      status: opts.status ?? 'ACTIVE',
    },
  });
}

export async function createStall(name: string, members: { userId: number; role?: VendorRole }[] = []) {
  seq++;
  return prisma.foodStall.create({
    data: {
      name,
      slug: `quay-${seq}`,
      location: 'Tòa A',
      memberships: { create: members.map((m) => ({ userId: m.userId, role: m.role ?? 'OWNER' })) },
    },
  });
}

/** Tạo agent supertest đã đăng nhập (giữ cookie giữa các request) */
export async function loginAs(email: string, password = TEST_PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post(`${API}/auth/login`).send({ email, password });
  if (res.status !== 200) throw new Error(`Đăng nhập thất bại (${res.status}): ${JSON.stringify(res.body)}`);
  return agent;
}

export { request, prisma };
