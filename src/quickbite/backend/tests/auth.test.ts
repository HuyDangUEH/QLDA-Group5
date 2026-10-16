import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API, TEST_PASSWORD, app, createUser, loginAs, prisma, request, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const validRegister = {
  fullName: 'Nguyễn Văn Test',
  email: 'Test.User@Example.com',
  password: 'Matkhau123',
  phone: '0901234567',
  studentCode: 'SV001',
};

function getSessionCookie(res: request.Response) {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return cookies.find((c) => c.startsWith('qb_session='));
}

describe('POST /auth/register', () => {
  it('tạo tài khoản sinh viên, đặt cookie httpOnly và không trả về mật khẩu', async () => {
    const res = await request(app).post(`${API}/auth/register`).send(validRegister);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'test.user@example.com', role: 'STUDENT', fullName: 'Nguyễn Văn Test' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion/);

    const cookie = getSessionCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const saved = await prisma.user.findUniqueOrThrow({ where: { email: 'test.user@example.com' } });
    expect(saved.passwordHash).not.toBe(validRegister.password);
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('bỏ qua trường role do client gửi lên (không thể tự đăng ký làm ADMIN)', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ ...validRegister, role: 'ADMIN', status: 'ACTIVE' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('từ chối email đã tồn tại (không phân biệt hoa thường)', async () => {
    await createUser({ email: 'test.user@example.com' });
    const res = await request(app).post(`${API}/auth/register`).send(validRegister);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Email này đã được đăng ký');
  });

  it('trả lỗi validation chi tiết theo từng trường', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ fullName: 'A', email: 'khong-phai-email', password: 'yeu' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'password']));
  });
});

describe('POST /auth/login', () => {
  it('đăng nhập thành công và /auth/me trả về người dùng', async () => {
    const user = await createUser({ email: 'sv@test.local' });
    const agent = await loginAs('SV@test.local');
    const me = await agent.get(`${API}/auth/me`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(user.id);
  });

  it('sai mật khẩu và email không tồn tại trả về CÙNG một thông báo', async () => {
    await createUser({ email: 'sv@test.local' });
    const wrongPass = await request(app).post(`${API}/auth/login`).send({ email: 'sv@test.local', password: 'SaiMatKhau1' });
    const noUser = await request(app).post(`${API}/auth/login`).send({ email: 'khongco@test.local', password: 'SaiMatKhau1' });

    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body.error.message).toBe(noUser.body.error.message);
    expect(getSessionCookie(wrongPass)).toBeUndefined();
  });

  it('tài khoản bị khoá không đăng nhập được', async () => {
    await createUser({ email: 'khoa@test.local', status: 'SUSPENDED' });
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'khoa@test.local', password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/tạm khoá/);
  });
});

describe('Phiên đăng nhập', () => {
  it('/auth/me không có cookie trả 401', async () => {
    const res = await request(app).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('token bị sửa đổi bị từ chối', async () => {
    const res = await request(app).get(`${API}/auth/me`).set('Cookie', 'qb_session=eyJhbGciOiJIUzI1NiJ9.gia.mao');
    expect(res.status).toBe(401);
  });

  it('đăng xuất xoá cookie và phiên không còn dùng được', async () => {
    await createUser({ email: 'sv@test.local' });
    const agent = await loginAs('sv@test.local');
    const out = await agent.post(`${API}/auth/logout`);
    expect(out.status).toBe(200);
    expect(getSessionCookie(out)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await agent.get(`${API}/auth/me`)).status).toBe(401);
  });

  it('khoá tài khoản làm phiên đang đăng nhập mất hiệu lực ngay', async () => {
    const user = await createUser({ email: 'sv@test.local' });
    const agent = await loginAs('sv@test.local');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });
    expect((await agent.get(`${API}/auth/me`)).status).toBe(401);
  });

  it('cho phép request cùng origin với API (vd: Swagger UI tại /api/docs)', async () => {
    await createUser({ email: 'sv@test.local' });
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set('Host', 'localhost:4000')
      .set('Origin', 'http://localhost:4000')
      .send({ email: 'sv@test.local', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });

  it('chặn Origin lạ dù trang lạ cố giả Host', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set('Host', 'localhost:4000')
      .set('Origin', 'https://localhost:4000.trang-xau.example')
      .send({ email: 'a@b.cd', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('chặn request thay đổi dữ liệu từ Origin lạ (CSRF)', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set('Origin', 'https://trang-web-xau.example')
      .send({ email: 'a@b.cd', password: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('Hồ sơ & đổi mật khẩu', () => {
  it('cập nhật hồ sơ (bỏ trống số điện thoại thành null)', async () => {
    await createUser({ email: 'sv@test.local' });
    const agent = await loginAs('sv@test.local');
    const res = await agent.patch(`${API}/users/me`).send({ fullName: 'Tên Mới', phone: '', studentCode: 'SV999' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ fullName: 'Tên Mới', phone: null, studentCode: 'SV999' });
  });

  it('sai mật khẩu hiện tại thì không đổi được', async () => {
    await createUser({ email: 'sv@test.local' });
    const agent = await loginAs('sv@test.local');
    const res = await agent
      .patch(`${API}/users/me/password`)
      .send({ currentPassword: 'SaiMatKhau1', newPassword: 'MatKhauMoi2' });
    expect(res.status).toBe(400);
  });

  it('đổi mật khẩu: thiết bị khác bị đăng xuất, thiết bị hiện tại vẫn đăng nhập', async () => {
    await createUser({ email: 'sv@test.local' });
    const current = await loginAs('sv@test.local');
    const otherDevice = await loginAs('sv@test.local');

    const res = await current
      .patch(`${API}/users/me/password`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'MatKhauMoi2' });
    expect(res.status).toBe(200);

    expect((await current.get(`${API}/auth/me`)).status).toBe(200);
    expect((await otherDevice.get(`${API}/auth/me`)).status).toBe(401);
    await expect(loginAs('sv@test.local', 'MatKhauMoi2')).resolves.toBeDefined();
    await expect(loginAs('sv@test.local')).rejects.toThrow();
  });
});
