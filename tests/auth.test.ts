import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server'; // Đường dẫn tới file Express app của bạn
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API Tests (Xác thực & Phân quyền)', () => {
  const testUser = {
    fullName: 'Sinh Viên Test',
    email: 'test.student@st.ueh.edu.vn',
    password: 'QuickBite@2026'
  };

  it('TC-AUTH-01: Đăng ký thành công với email UEH', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Đăng ký thành công');
  });

  it('TC-AUTH-02: Chặn đăng ký email ngoài UEH', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'hacker@gmail.com' });
    
    expect(res.status).toBe(400);
  });

  it('TC-AUTH-04: Đăng nhập thành công và trả về httpOnly Cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined(); // Phải có cookie JWT
  });

  it('TC-AUTH-05: Chặn đăng nhập khi sai mật khẩu', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword' });
    
    expect(res.status).toBe(401);
  });
});