import { describe, expect, it } from 'vitest';
import { parseSmokeArgs, runSmoke } from '../scripts/smoke-test.js';

const API = 'https://api.qb.test';
const WEB = 'https://web.qb.test';
const SECURITY = {
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'",
  'x-frame-options': 'SAMEORIGIN',
};
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...SECURITY, ...headers } });
const html = (status = 200) => new Response('<div id="root"></div><script src="/assets/index-abc.js"></script>', { status, headers: { 'content-type': 'text/html' } });

/** Giả lập một hệ thống production khoẻ mạnh; `override` để làm hỏng từng phần */
function fakeProduction(override: (url: string, init?: RequestInit) => Response | undefined = () => undefined): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const custom = override(url, init);
    if (custom) return custom;
    const origin = new Headers(init?.headers).get('origin');
    const p = url.replace(API, '').replace(WEB, '');
    if (p.endsWith('/health')) return json(200, { success: true, data: { status: 'ok', database: 'connected' } });
    if (p === '/api/v1/openapi.json') return json(200, { info: { version: '1.0.0' } });
    if (/\/(categories|stalls|menu-items|pickup-locations)/.test(p)) {
      const cors: Record<string, string> = origin === WEB ? { 'access-control-allow-origin': WEB, 'access-control-allow-credentials': 'true' } : {};
      return json(200, { success: true, data: [{ id: 1 }, { id: 2 }] }, cors);
    }
    if (p === '/api/v1/home') return json(200, { success: true, data: {} });
    if (p === '/api/v1/auth/login') return json(200, { success: true, data: { user: { role: 'STUDENT' } } }, { 'set-cookie': 'qb_session=abc; Path=/; HttpOnly; Secure; SameSite=Lax' });
    if (p === '/api/v1/auth/me') return new Headers(init?.headers).get('cookie') ? json(200, { success: true, data: { user: { role: 'STUDENT' } } }) : json(401, { success: false, error: { code: 'UNAUTHORIZED' } });
    if (p === '/api/v1/auth/logout') return new Response(null, { status: 204 });
    if (/\/(orders|admin\/users)$/.test(p)) return json(401, { success: false, error: { code: 'UNAUTHORIZED' } });
    if (p.startsWith('/api/v1/')) return json(404, { success: false, error: { code: 'NOT_FOUND' } });
    if (p === '/assets/index-abc.js') return new Response('console.log(1)', { status: 200 });
    return html();
  }) as typeof fetch;
}

const byName = (results: Awaited<ReturnType<typeof runSmoke>>, name: string) => results.find((r) => r.name.includes(name));

describe('Smoke test sau triển khai', () => {
  it('hệ thống khoẻ → mọi mục PASS (backend, frontend, chặn khi chưa đăng nhập, header, CORS)', async () => {
    const results = await runSmoke({ api: API, web: WEB, version: '1.0.0', fetchImpl: fakeProduction() });
    expect(results.filter((r) => r.status !== 'PASS')).toEqual([]);
    expect(results.length).toBe(20);
  });

  it('database mất kết nối → FAIL', async () => {
    const f = fakeProduction((u) => (u.endsWith('/health') ? json(503, { success: false, data: { status: 'error', database: 'disconnected' } }) : undefined));
    expect(byName(await runSmoke({ api: API, fetchImpl: f }), 'API sống')?.status).toBe('FAIL');
  });

  it('sai phiên bản → FAIL; tắt tài liệu API → WARN', async () => {
    expect(byName(await runSmoke({ api: API, version: '1.1.0', fetchImpl: fakeProduction() }), 'Phiên bản')).toMatchObject({ status: 'FAIL', detail: 'đang chạy 1.0.0, mong đợi 1.1.0' });
    const off = fakeProduction((u) => (u.endsWith('/openapi.json') ? json(404, {}) : undefined));
    expect(byName(await runSmoke({ api: API, fetchImpl: off }), 'Phiên bản')?.status).toBe('WARN');
  });

  it('API riêng tư trả dữ liệu khi chưa đăng nhập → FAIL', async () => {
    const leak = fakeProduction((u) => (u.endsWith('/admin/users') ? json(200, { success: true, data: [] }) : undefined));
    expect(byName(await runSmoke({ api: API, fetchImpl: leak }), '/admin/users')?.status).toBe('FAIL');
  });

  it('CORS mở cho mọi trang → FAIL; thiếu header bảo mật → FAIL', async () => {
    const open = fakeProduction((u) => (u.includes('/categories') ? new Response('{"success":true,"data":[1]}', { status: 200, headers: { 'access-control-allow-origin': '*' } }) : undefined));
    const results = await runSmoke({ api: API, fetchImpl: open });
    expect(byName(results, 'trang lạ')?.status).toBe('FAIL');
    expect(byName(results, 'Header bảo mật')?.detail).toContain('strict-transport-security');
  });

  it('frontend thiếu cấu hình SPA (mở thẳng trang con bị 404) → FAIL', async () => {
    const noSpa = fakeProduction((u) => (u === `${WEB}/quan-ly/bao-cao` ? new Response('Not found', { status: 404 }) : undefined));
    expect(byName(await runSmoke({ api: API, web: WEB, fetchImpl: noSpa }), '/quan-ly/bao-cao')?.status).toBe('FAIL');
  });

  it('mạng lỗi → FAIL kèm thông báo, không dừng các mục khác', async () => {
    const down = fakeProduction((u) => {
      if (u.endsWith('/home')) throw new Error('fetch failed');
      return undefined;
    });
    const results = await runSmoke({ api: API, fetchImpl: down });
    expect(byName(results, 'Trang chủ (API')).toMatchObject({ status: 'FAIL', detail: 'fetch failed' });
    expect(byName(results, 'Danh mục')?.status).toBe('PASS');
  });

  it('có tài khoản kiểm thử → đăng nhập (cookie Secure + HttpOnly), xem /auth/me, đăng xuất', async () => {
    const results = await runSmoke({ api: API, web: WEB, credentials: { email: 'kiem.thu@truong.edu.vn', password: 'x' }, fetchImpl: fakeProduction() });
    expect(byName(results, 'Đăng nhập')?.status).toBe('PASS');
    expect(byName(results, 'Xem tài khoản')?.detail).toContain('STUDENT');
    expect(byName(results, 'Đăng xuất')?.status).toBe('PASS');
    expect(JSON.stringify(results)).not.toContain('kiem.thu@');
  });

  it('đọc tham số: bắt buộc --api, chỉ nhận http(s); tài khoản lấy từ biến môi trường', () => {
    expect(() => parseSmokeArgs([], {})).toThrow('Thiếu --api');
    expect(() => parseSmokeArgs(['--api=ftp://x'], {})).toThrow('không hợp lệ');
    expect(parseSmokeArgs(['--api=https://a', '--web=https://b', '--version=1.0.0'], { SMOKE_EMAIL: 'e', SMOKE_PASSWORD: 'p' })).toEqual({
      api: 'https://a', web: 'https://b', version: '1.0.0', credentials: { email: 'e', password: 'p' },
    });
  });
});
