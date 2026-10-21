import express from 'express';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API, app, request } from './helpers.js';
import { errorHandler } from '../src/middlewares/error-handler.js';
import { AppError } from '../src/utils/app-error.js';

const ALLOWED = 'http://localhost:5173';

describe('Helmet: header bảo mật', () => {
  it('có các header bảo mật và không lộ "X-Powered-By: Express"', async () => {
    const res = await request(app).get(`${API}/health`);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });
});

describe('CORS', () => {
  it('origin được khai báo trong CORS_ORIGINS → cho phép, kèm cookie', async () => {
    const res = await request(app).get(`${API}/health`).set('Origin', ALLOWED);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('origin lạ → trình duyệt không nhận được header cho phép', async () => {
    const res = await request(app).get(`${API}/health`).set('Origin', 'https://trang-la.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('preflight OPTIONS từ origin hợp lệ → 204', async () => {
    const res = await request(app)
      .options(`${API}/auth/login`)
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('POST từ trang web lạ bị chặn (chống CSRF) → 403 tiếng Việt', async () => {
    const res = await request(app).post(`${API}/auth/login`).set('Origin', 'https://trang-la.example').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Yêu cầu bị chặn: nguồn gửi không hợp lệ');
  });
});

describe('Xử lý lỗi tập trung', () => {
  it('đường dẫn không tồn tại → 404, định dạng chung, tiếng Việt', async () => {
    const res = await request(app).get(`${API}/khong-ton-tai`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn GET /api/v1/khong-ton-tai' } });
  });

  it('dữ liệu sai (Zod) → 400 VALIDATION_ERROR kèm lỗi từng trường', async () => {
    const res = await request(app).post(`${API}/auth/register`).send({ email: 'khong-phai-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Dữ liệu gửi lên không hợp lệ');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'email' }), expect.objectContaining({ field: 'password' })]));
  });

  it('body JSON sai cú pháp → 400 INVALID_JSON', async () => {
    const res = await request(app).post(`${API}/auth/login`).set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'INVALID_JSON', message: 'Body JSON không hợp lệ' });
  });

  it('body quá lớn (> 100 KB) → 413 PAYLOAD_TOO_LARGE (không phải lỗi hệ thống 500)', async () => {
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'a'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toEqual({ code: 'PAYLOAD_TOO_LARGE', message: 'Dữ liệu gửi lên quá lớn' });
    expect((await request(app).get(`${API}/health`)).status).toBe(200);
  });

  it('bảng mã body không hỗ trợ → 4xx, không phải 500', async () => {
    const res = await request(app).post(`${API}/auth/login`).set('Content-Type', 'application/json; charset=klingon').send('{}');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  // App nhỏ dùng đúng errorHandler của dự án để thử các loại lỗi khó tạo qua API thật
  const mini = express();
  mini.get('/app-error', () => {
    throw AppError.unprocessable('Quầy đang tạm ngưng nhận đơn', { stallId: 1 });
  });
  mini.get('/zod', () => {
    z.object({ quantity: z.number().min(1, 'Số lượng tối thiểu là 1') }).parse({ quantity: 0 });
  });
  mini.get('/crash', () => {
    throw new Error('Mật khẩu DB: secret123 — lỗi nội bộ không được lộ ra ngoài');
  });
  mini.get('/async-crash', async () => {
    await Promise.resolve();
    throw new TypeError('Cannot read properties of undefined');
  });
  mini.use(errorHandler);

  it('lỗi nghiệp vụ (AppError) → đúng mã HTTP, thông báo và chi tiết', async () => {
    const res = await request(mini).get('/app-error');
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({ code: 'BUSINESS_RULE_VIOLATION', message: 'Quầy đang tạm ngưng nhận đơn', details: { stallId: 1 } });
  });

  it('ZodError ở bất kỳ đâu → 400 với thông báo của từng trường', async () => {
    const res = await request(mini).get('/zod');
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'quantity', message: 'Số lượng tối thiểu là 1' }]);
  });

  it('lỗi không lường trước → 500 thông báo chung, KHÔNG lộ nội dung lỗi / stack trace', async () => {
    for (const path of ['/crash', '/async-crash']) {
      const res = await request(mini).get(path);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau' } });
      expect(JSON.stringify(res.body)).not.toMatch(/secret123|stack|TypeError/);
    }
  });
});
