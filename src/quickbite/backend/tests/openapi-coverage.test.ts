/**
 * Swagger mô tả ĐỦ và ĐÚNG API:
 * 1. Đủ 2 chiều: mọi route khai báo trong code đều có trong tài liệu, và ngược lại.
 * 2. Các API chính có mô tả dữ liệu trả về cụ thể (không chỉ là "object" chung chung).
 * 3. Gọi API thật: các trường trả về khớp đúng với schema trong tài liệu (không thiếu trường bắt buộc, không có trường chưa mô tả).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApiSpec } from '../src/docs/openapi.js';
import { API, app, createStall, createUser, loginAs, prisma, request, resetDatabase } from './helpers.js';

type Json = Record<string, unknown>;
const METHODS = ['get', 'post', 'patch', 'put', 'delete'] as const;
const SRC = path.resolve(import.meta.dirname, '../src');

/** Đổi :id / {id} → {} để so sánh đường dẫn không phụ thuộc tên tham số */
const normalize = (p: string) => (p.replace(/:\w+/g, '{}').replace(/\{\w+\}/g, '{}').replace(/\/+$/, '') || '/');

/** Đọc mã nguồn các router Express, ghép tiền tố mount → danh sách "METHOD /path" thật của server */
function routesInCode(): string[] {
  const files = [path.join(SRC, 'routes/index.ts')];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.routes.ts')) files.push(p);
    }
  };
  walk(path.join(SRC, 'modules'));

  const routes = new Map<string, { method: string; path: string }[]>();
  const mounts = new Map<string, { prefix: string; child: string }[]>();
  for (const file of files) {
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/const\s+(\w+)\s*=\s*Router\(/g)) routes.set(m[1]!, routes.get(m[1]!) ?? []);
    for (const m of code.matchAll(/(\w+)\.(get|post|patch|put|delete)\(\s*'([^']*)'/g)) {
      routes.set(m[1]!, [...(routes.get(m[1]!) ?? []), { method: m[2]!, path: m[3]! }]);
    }
    for (const m of code.matchAll(/(\w+)\.use\(\s*'([^']*)'\s*,([^)]*)\)/g)) {
      const child = m[3]!.split(',').map((s) => s.trim()).filter(Boolean).at(-1)!;
      mounts.set(m[1]!, [...(mounts.get(m[1]!) ?? []), { prefix: m[2]!, child }]);
    }
  }
  const out: string[] = [];
  const visit = (router: string, prefix: string) => {
    for (const r of routes.get(router) ?? []) out.push(`${r.method.toUpperCase()} ${normalize(prefix + (r.path === '/' ? '' : r.path))}`);
    for (const m of mounts.get(router) ?? []) if (routes.has(m.child)) visit(m.child, prefix + (m.prefix === '/' ? '' : m.prefix));
  };
  visit('apiRouter', '');
  return [...new Set(out)].sort();
}

const routesInDocs = () =>
  Object.entries(openApiSpec.paths)
    .flatMap(([p, item]) => METHODS.filter((m) => m in item).map((m) => `${m.toUpperCase()} ${normalize(p)}`))
    .sort();

/** Lấy schema của "data" trong phản hồi thành công của một thao tác */
function dataSchema(p: string, method: string): Json | undefined {
  const op = (openApiSpec.paths as unknown as Record<string, Record<string, { responses: Record<string, Json> }>>)[p]?.[method];
  const success = Object.entries(op?.responses ?? {}).find(([code]) => code.startsWith('2'))?.[1] as Json | undefined;
  const schema = (success?.content as Record<string, { schema: Json }> | undefined)?.['application/json']?.schema;
  return (schema?.properties as Record<string, Json> | undefined)?.data;
}

const components = openApiSpec.components.schemas as unknown as Record<string, Json>;
const resolve = (s: Json): Json => (typeof s.$ref === 'string' ? resolve(components[s.$ref.split('/').pop()!]!) : s);

/**
 * So dữ liệu thật với schema: với mỗi object có khai báo `properties`, tập trường thật phải TRÙNG
 * tập trường trong tài liệu. Trả về danh sách lỗi dạng "đường.dẫn: thiếu x / thừa y".
 */
function compare(value: unknown, schema: Json, at: string, errors: string[]) {
  const s = resolve(schema);
  if (Array.isArray(s.oneOf)) {
    if (value === null) return;
    const objectVariant = (s.oneOf as Json[]).map(resolve).find((v) => v.type !== 'null');
    if (objectVariant) compare(value, objectVariant, at, errors);
    return;
  }
  if (s.type === 'array' && Array.isArray(value)) {
    if (value.length > 0 && s.items) compare(value[0], s.items as Json, `${at}[0]`, errors);
    return;
  }
  if (s.properties && value && typeof value === 'object' && !Array.isArray(value)) {
    const documented = Object.keys(s.properties as Json);
    const actual = Object.keys(value);
    // Trường bắt buộc: theo `required` nếu tài liệu có khai báo, không thì mọi trường đã mô tả
    const required = Array.isArray(s.required) ? (s.required as string[]) : documented;
    const missing = required.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !documented.includes(k));
    if (missing.length || extra.length) errors.push(`${at}: ${missing.length ? `thiếu ${missing.join(', ')}` : ''}${missing.length && extra.length ? ' · ' : ''}${extra.length ? `chưa mô tả ${extra.join(', ')}` : ''}`);
    for (const k of documented.filter((x) => actual.includes(x))) compare((value as Json)[k], (s.properties as Record<string, Json>)[k]!, `${at}.${k}`, errors);
  }
}

describe('Swagger mô tả đủ API (đối chiếu 2 chiều với mã nguồn)', () => {
  const code = routesInCode();
  const docs = routesInDocs();

  it('đọc được danh sách route của server', () => {
    expect(code.length).toBeGreaterThan(50);
    expect(code).toContain('GET /health');
    expect(code).toContain('PATCH /vendor/stalls/{}/orders/{}/status');
    expect(code).toContain('POST /admin/stalls/{}/members');
  });

  it('mọi route trên server đều có trong tài liệu', () => {
    expect(code.filter((r) => !docs.includes(r)), 'route chưa có trong Swagger').toEqual([]);
  });

  it('mọi thao tác trong tài liệu đều có trên server', () => {
    expect(docs.filter((r) => !code.includes(r)), 'Swagger mô tả route không tồn tại').toEqual([]);
  });
});

/** API chính: phải có schema dữ liệu trả về cụ thể */
const MAIN_APIS: [string, string][] = [
  ['/home', 'get'], ['/categories', 'get'], ['/stalls', 'get'], ['/stalls/{idOrSlug}', 'get'], ['/menu-items', 'get'], ['/menu-items/{id}', 'get'], ['/pickup-locations', 'get'],
  ['/auth/register', 'post'], ['/auth/login', 'post'], ['/auth/me', 'get'],
  ['/cart', 'get'], ['/cart/items', 'post'], ['/orders', 'post'], ['/orders', 'get'], ['/orders/{id}', 'get'], ['/orders/{id}/cancel', 'post'],
  ['/notifications', 'get'], ['/notifications/unread-count', 'get'], ['/payments/banks', 'get'],
  ['/vendor/stalls/{stallId}/dashboard', 'get'], ['/vendor/stalls/{stallId}/reports', 'get'], ['/vendor/stalls/{stallId}/orders', 'get'], ['/vendor/stalls/{stallId}/orders/{orderId}', 'get'],
  ['/admin/users', 'get'], ['/admin/orders', 'get'],
];

describe('API chính có mô tả dữ liệu trả về', () => {
  it.each(MAIN_APIS)('%s (%s)', (p, method) => {
    const data = dataSchema(p, method);
    expect(data, `${method.toUpperCase()} ${p} chưa có schema "data"`).toBeDefined();
    expect(JSON.stringify(data), `${method.toUpperCase()} ${p} chỉ mô tả "object" chung chung`).not.toBe(JSON.stringify({ type: 'object' }));
  });
});

describe('Dữ liệu trả về thật khớp với Swagger', () => {
  const ctx = {} as { student: Awaited<ReturnType<typeof loginAs>>; owner: Awaited<ReturnType<typeof loginAs>>; admin: Awaited<ReturnType<typeof loginAs>>; stallId: number; slug: string; itemId: number; orderId: number };

  beforeAll(async () => {
    await resetDatabase();
    await createUser({ role: 'STUDENT', email: 'sv.swagger@test.local' });
    const owner = await createUser({ role: 'VENDOR', email: 'owner.swagger@test.local' });
    await createUser({ role: 'ADMIN', email: 'admin.swagger@test.local' });
    const category = await prisma.foodCategory.create({ data: { name: 'Cơm', slug: 'com', icon: 'utensils' } });
    const stall = await createStall('Quầy Swagger', [{ userId: owner.id, role: 'OWNER' }]);
    await prisma.foodStall.update({ where: { id: stall.id }, data: { openTime: '00:00', closeTime: '00:00' } });
    const item = await prisma.menuItem.create({ data: { stallId: stall.id, categoryId: category.id, name: 'Cơm gà', price: new Prisma.Decimal(35000), isFeatured: true } });
    const pickup = await prisma.campusPickupLocation.create({ data: { name: 'Sảnh A1', building: 'Tòa A' } });

    ctx.student = await loginAs('sv.swagger@test.local');
    ctx.owner = await loginAs('owner.swagger@test.local');
    ctx.admin = await loginAs('admin.swagger@test.local');
    await ctx.student.post(`${API}/cart/items`).send({ menuItemId: item.id, quantity: 2 });
    const order = await ctx.student.post(`${API}/orders`).send({ pickupLocationId: pickup.id, idempotencyKey: 'swagger-1' });
    if (order.status !== 201) throw new Error(JSON.stringify(order.body));
    Object.assign(ctx, { stallId: stall.id, slug: stall.slug, itemId: item.id, orderId: order.body.data.order.id });
  });
  afterAll(() => prisma.$disconnect());

  const cases: [string, string, () => Promise<{ status: number; body: { data: unknown } }>][] = [
    ['/home', 'get', () => request(app).get(`${API}/home`)],
    ['/categories', 'get', () => request(app).get(`${API}/categories`)],
    ['/stalls', 'get', () => request(app).get(`${API}/stalls`)],
    ['/stalls/{idOrSlug}', 'get', () => request(app).get(`${API}/stalls/${ctx.slug}`)],
    ['/menu-items', 'get', () => request(app).get(`${API}/menu-items`)],
    ['/menu-items/{id}', 'get', () => request(app).get(`${API}/menu-items/${ctx.itemId}`)],
    ['/pickup-locations', 'get', () => request(app).get(`${API}/pickup-locations`)],
    ['/payments/banks', 'get', () => request(app).get(`${API}/payments/banks`)],
    ['/auth/me', 'get', () => ctx.student.get(`${API}/auth/me`)],
    ['/orders', 'get', () => ctx.student.get(`${API}/orders`)],
    ['/orders/{id}', 'get', () => ctx.student.get(`${API}/orders/${ctx.orderId}`)],
    ['/notifications', 'get', () => ctx.owner.get(`${API}/notifications`)],
    ['/notifications/unread-count', 'get', () => ctx.owner.get(`${API}/notifications/unread-count`)],
    ['/vendor/stalls/{stallId}/dashboard', 'get', () => ctx.owner.get(`${API}/vendor/stalls/${ctx.stallId}/dashboard`)],
    ['/vendor/stalls/{stallId}/reports', 'get', () => ctx.owner.get(`${API}/vendor/stalls/${ctx.stallId}/reports`)],
    ['/admin/users', 'get', () => ctx.admin.get(`${API}/admin/users`)],
    ['/cart', 'get', () => ctx.student.get(`${API}/cart`)],
    ['/vendor/stalls/{stallId}/orders', 'get', () => ctx.owner.get(`${API}/vendor/stalls/${ctx.stallId}/orders?tab=new`)],
    ['/vendor/stalls/{stallId}/orders/{orderId}', 'get', () => ctx.owner.get(`${API}/vendor/stalls/${ctx.stallId}/orders/${ctx.orderId}`)],
    ['/admin/orders', 'get', () => ctx.admin.get(`${API}/admin/orders`)],
  ];

  it.each(cases)('%s (%s)', async (p, method, call) => {
    const res = await call();
    expect(res.status).toBe(200);
    const errors: string[] = [];
    compare(res.body.data, dataSchema(p, method)!, 'data', errors);
    expect(errors, `${method.toUpperCase()} ${p} lệch với Swagger`).toEqual([]);
  });
});

describe('File tài liệu tĩnh docs/openapi.json', () => {
  it('khớp với đặc tả trong code (chạy "npm run docs:openapi" sau khi sửa API)', async () => {
    const { OPENAPI_FILE, serializeSpec } = await import('../scripts/export-openapi.js');
    expect(readFileSync(OPENAPI_FILE, 'utf8').replace(/\r\n/g, '\n')).toBe(serializeSpec());
  });
});
