import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API, app, createUser, prisma, request, resetDatabase } from '../src/quickbite/backend/tests/helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('Auth API Tests (Xác thực & Phân quyền)', () => {
  const testUser = {
    fullName: 'Sinh Viên Test',
    email: 'test.student@example.com',
    password: 'Matkhau123',
    phone: '0901234567',
    studentCode: 'SV001',
  };

  it('TC-AUTH-01: Đăng ký thành công và tạo tài khoản sinh viên', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send(testUser);
    
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: testUser.email, role: 'STUDENT' });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('TC-AUTH-02: Từ chối đăng nhập khi sai mật khẩu', async () => {
    await createUser({ email: testUser.email });
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: testUser.email, password: 'SaiMatKhau1' });
    
    expect(res.status).toBe(401);
  });

  it('TC-AUTH-03: Không truy cập hồ sơ khi chưa đăng nhập', async () => {
    const res = await request(app).get(`${API}/auth/me`);

    expect(res.status).toBe(401);
  });
});