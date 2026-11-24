/**
 * Smoke test sau khi triển khai (chỉ ĐỌC, không tạo / sửa dữ liệu):
 *   npm run smoke -- --api=https://backend-henna-iota-13.vercel.app --web=https://quickbite-coral.vercel.app
 *
 * Kiểm tra: API sống + kết nối database, phiên bản API, dữ liệu công khai (danh mục, quầy, món, điểm nhận),
 * API cần đăng nhập trả 401, header bảo mật, CORS không mở cho trang lạ, giao diện + đường dẫn trang con,
 * frontend chuyển /api sang backend, thời gian phản hồi.
 *
 * Tuỳ chọn kiểm tra đăng nhập: đặt biến SMOKE_EMAIL và SMOKE_PASSWORD (tài khoản kiểm thử) rồi chạy lại.
 * Script chỉ đăng nhập → xem /auth/me → đăng xuất, không in mật khẩu.
 * Thoát mã 1 nếu có mục FAIL → dùng làm điều kiện "đạt" khi triển khai.
 */
import path from 'node:path';

export type SmokeStatus = 'PASS' | 'WARN' | 'FAIL';
export interface SmokeResult {
  name: string;
  status: SmokeStatus;
  detail: string;
  ms: number;
}
export interface SmokeOptions {
  api: string;
  web?: string;
  version?: string;
  credentials?: { email: string; password: string };
  fetchImpl?: typeof fetch;
  /** Phản hồi chậm hơn ngưỡng này (ms) → WARN */
  slowMs?: number;
}

const trimSlash = (u: string) => u.replace(/\/+$/, '');

export async function runSmoke(opts: SmokeOptions): Promise<SmokeResult[]> {
  const f = opts.fetchImpl ?? fetch;
  const api = `${trimSlash(opts.api)}/api/v1`;
  const web = opts.web && trimSlash(opts.web);
  const slowMs = opts.slowMs ?? 3000;
  const results: SmokeResult[] = [];

  async function check(name: string, fn: () => Promise<{ status: SmokeStatus; detail: string }>) {
    const t = Date.now();
    try {
      const r = await fn();
      const ms = Date.now() - t;
      results.push({ name, ...r, ms, ...(r.status === 'PASS' && ms > slowMs && { status: 'WARN' as const, detail: `${r.detail} — chậm (${ms} ms)` }) });
    } catch (err) {
      results.push({ name, status: 'FAIL', detail: err instanceof Error ? err.message : String(err), ms: Date.now() - t });
    }
  }
  const getJson = async (url: string, init?: RequestInit) => {
    const res = await f(url, { redirect: 'manual', ...init, headers: { Accept: 'application/json', ...init?.headers } });
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: unknown; error?: { code?: string } } | null;
    return { res, body };
  };
  const listOf = (data: unknown): unknown[] => (Array.isArray(data) ? data : []);

  // ─── Backend ───
  await check('API sống + database', async () => {
    const { res, body } = await getJson(`${api}/health`);
    const d = body?.data as { status?: string; database?: string } | undefined;
    return res.status === 200 && d?.status === 'ok' && d.database === 'connected'
      ? { status: 'PASS', detail: 'status ok, database connected' }
      : { status: 'FAIL', detail: `HTTP ${res.status} ${JSON.stringify(d ?? body)}` };
  });

  await check('Phiên bản API', async () => {
    const res = await f(`${api}/openapi.json`);
    if (res.status === 404) return { status: 'WARN', detail: 'tài liệu API đang tắt (API_DOCS) — không đọc được phiên bản' };
    const v = ((await res.json()) as { info?: { version?: string } }).info?.version;
    if (opts.version && v !== opts.version) return { status: 'FAIL', detail: `đang chạy ${v}, mong đợi ${opts.version}` };
    return { status: 'PASS', detail: `v${v}` };
  });

  for (const [name, p, min] of [
    ['Danh mục món', '/categories', 1],
    ['Danh sách quầy', '/stalls?pageSize=5', 1],
    ['Danh sách món', '/menu-items?pageSize=5', 1],
    ['Điểm nhận món', '/pickup-locations', 1],
  ] as const) {
    await check(name, async () => {
      const { res, body } = await getJson(api + p);
      const n = listOf(body?.data).length;
      return res.status === 200 && body?.success && n >= min
        ? { status: 'PASS', detail: `HTTP 200, ${n} bản ghi` }
        : { status: 'FAIL', detail: `HTTP ${res.status}, ${n} bản ghi` };
    });
  }

  await check('Trang chủ (API tổng hợp)', async () => {
    const { res, body } = await getJson(`${api}/home`);
    return res.status === 200 && body?.success ? { status: 'PASS', detail: 'HTTP 200' } : { status: 'FAIL', detail: `HTTP ${res.status}` };
  });

  for (const [name, p] of [
    ['Chặn khi chưa đăng nhập: /auth/me', '/auth/me'],
    ['Chặn khi chưa đăng nhập: /orders', '/orders'],
    ['Chặn khi chưa đăng nhập: /admin/users', '/admin/users'],
  ] as const) {
    await check(name, async () => {
      const { res, body } = await getJson(api + p);
      return res.status === 401 ? { status: 'PASS', detail: `HTTP 401 ${body?.error?.code ?? ''}`.trim() } : { status: 'FAIL', detail: `HTTP ${res.status} — phải là 401` };
    });
  }

  await check('Đường dẫn không tồn tại → 404 JSON', async () => {
    const { res, body } = await getJson(`${api}/khong-ton-tai-smoke`);
    return res.status === 404 && body?.error?.code === 'NOT_FOUND' ? { status: 'PASS', detail: 'HTTP 404 NOT_FOUND' } : { status: 'FAIL', detail: `HTTP ${res.status}` };
  });

  await check('Header bảo mật', async () => {
    const res = await f(`${api}/categories`);
    const need = ['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'x-frame-options'];
    const missing = need.filter((h) => !res.headers.get(h));
    if (res.headers.get('x-powered-by')) missing.push('(còn x-powered-by)');
    return missing.length ? { status: 'FAIL', detail: `thiếu ${missing.join(', ')}` } : { status: 'PASS', detail: 'HSTS, nosniff, CSP, X-Frame-Options' };
  });

  await check('CORS không mở cho trang lạ', async () => {
    const res = await f(`${api}/categories`, { headers: { Origin: 'https://trang-la.example' } });
    const allow = res.headers.get('access-control-allow-origin');
    return !allow ? { status: 'PASS', detail: 'không trả Access-Control-Allow-Origin cho origin lạ' } : { status: 'FAIL', detail: `Access-Control-Allow-Origin: ${allow}` };
  });

  if (web) {
    await check('CORS cho phép frontend', async () => {
      const res = await f(`${api}/categories`, { headers: { Origin: web } });
      const allow = res.headers.get('access-control-allow-origin');
      return allow === web && res.headers.get('access-control-allow-credentials') === 'true'
        ? { status: 'PASS', detail: `${allow} (kèm cookie)` }
        : { status: 'WARN', detail: `Access-Control-Allow-Origin: ${allow ?? '(không có)'} — chỉ cần nếu frontend gọi thẳng backend` };
    });
  }

  // ─── Frontend ───
  if (web) {
    await check('Giao diện: trang chủ', async () => {
      const res = await f(`${web}/`);
      const html = await res.text();
      const js = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
      if (res.status !== 200 || !html.includes('id="root"') || !js) return { status: 'FAIL', detail: `HTTP ${res.status}, thiếu #root hoặc file JS` };
      const asset = await f(web + js);
      return asset.status === 200 ? { status: 'PASS', detail: `HTTP 200, ${js} tải được` } : { status: 'FAIL', detail: `${js} → HTTP ${asset.status}` };
    });

    for (const p of ['/mon-an', '/quan-an', '/dang-nhap', '/quan-ly/bao-cao']) {
      await check(`Giao diện: mở thẳng ${p}`, async () => {
        const res = await f(web + p);
        const html = await res.text();
        return res.status === 200 && html.includes('id="root"') ? { status: 'PASS', detail: 'HTTP 200 (SPA)' } : { status: 'FAIL', detail: `HTTP ${res.status} — thiếu cấu hình chuyển mọi đường dẫn về index.html` };
      });
    }

    await check('Frontend chuyển /api sang backend', async () => {
      const { res, body } = await getJson(`${web}/api/v1/health`);
      return res.status === 200 && (body?.data as { status?: string })?.status === 'ok'
        ? { status: 'PASS', detail: `${web}/api/v1/health → ok` }
        : { status: 'FAIL', detail: `HTTP ${res.status}` };
    });
  }

  // ─── Đăng nhập (tuỳ chọn) ───
  if (opts.credentials) {
    const base = web ? `${web}/api/v1` : api;
    let cookie = '';
    await check('Đăng nhập tài khoản kiểm thử', async () => {
      const res = await f(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(opts.credentials),
      });
      cookie = (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
      const flags = res.headers.get('set-cookie') ?? '';
      if (res.status !== 200 || !cookie) return { status: 'FAIL', detail: `HTTP ${res.status}` };
      const secure = /secure/i.test(flags) && /httponly/i.test(flags);
      return secure ? { status: 'PASS', detail: 'HTTP 200, cookie Secure + HttpOnly' } : { status: 'FAIL', detail: 'cookie thiếu Secure / HttpOnly' };
    });
    if (cookie) {
      await check('Xem tài khoản đang đăng nhập', async () => {
        const { res, body } = await getJson(`${base}/auth/me`, { headers: { Cookie: cookie } });
        const role = (body?.data as { user?: { role?: string }; role?: string } | undefined);
        return res.status === 200 ? { status: 'PASS', detail: `HTTP 200, vai trò ${role?.user?.role ?? role?.role ?? '?'}` } : { status: 'FAIL', detail: `HTTP ${res.status}` };
      });
      await check('Đăng xuất', async () => {
        const res = await f(`${base}/auth/logout`, { method: 'POST', headers: { Cookie: cookie, Accept: 'application/json' } });
        return res.status < 300 ? { status: 'PASS', detail: `HTTP ${res.status}` } : { status: 'FAIL', detail: `HTTP ${res.status}` };
      });
    }
  }
  return results;
}

/** Đọc --ten=gia-tri */
export function parseSmokeArgs(argv: string[], env: Record<string, string | undefined>): SmokeOptions {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const api = get('api') ?? env.SMOKE_API_URL;
  if (!api) throw new Error('Thiếu --api=<địa chỉ backend> (hoặc biến SMOKE_API_URL)');
  for (const u of [api, get('web') ?? env.SMOKE_WEB_URL].filter(Boolean)) {
    if (!/^https?:\/\//.test(u!)) throw new Error(`Địa chỉ không hợp lệ: ${u}`);
  }
  return {
    api,
    web: get('web') ?? env.SMOKE_WEB_URL,
    version: get('version'),
    credentials: env.SMOKE_EMAIL && env.SMOKE_PASSWORD ? { email: env.SMOKE_EMAIL, password: env.SMOKE_PASSWORD } : undefined,
  };
}

async function main() {
  const opts = parseSmokeArgs(process.argv.slice(2), process.env);
  console.log(`🔥 Smoke test — API ${opts.api}${opts.web ? ` · Web ${opts.web}` : ''}`);
  console.log(`   ${new Date().toLocaleString('vi-VN')}${opts.credentials ? ' · có kiểm tra đăng nhập' : ' · không kiểm tra đăng nhập (chưa đặt SMOKE_EMAIL / SMOKE_PASSWORD)'}\n`);
  const results = await runSmoke(opts);
  const ICON = { PASS: '✅', WARN: '⚠️ ', FAIL: '❌' } as const;
  for (const r of results) console.log(`  ${ICON[r.status]} ${r.name.padEnd(38)} ${String(r.ms).padStart(5)} ms  ${r.detail}`);
  const count = (s: SmokeStatus) => results.filter((r) => r.status === s).length;
  console.log(`\nKết quả: ${count('PASS')} PASS · ${count('WARN')} WARN · ${count('FAIL')} FAIL / ${results.length} mục`);
  if (count('FAIL')) {
    console.log('❌ Smoke test KHÔNG ĐẠT');
    process.exitCode = 1;
  } else console.log('✅ Smoke test ĐẠT');
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  main().catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
