import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { API, app, prisma, request, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

/** 1 quầy, 2 danh mục, 7 món có giá / số đã bán / thời điểm tạo khác nhau */
async function seed() {
  const rice = await prisma.foodCategory.create({ data: { name: 'Cơm', slug: 'com', sortOrder: 1 } });
  const drinks = await prisma.foodCategory.create({ data: { name: 'Đồ uống', slug: 'do-uong', sortOrder: 2 } });
  const stall = await prisma.foodStall.create({ data: { name: 'Bếp Test', slug: 'bep-test', location: 'Tòa A', openTime: '00:00', closeTime: '00:00' } });
  const rows: [string, number, number, number, Partial<Prisma.MenuItemUncheckedCreateInput>?][] = [
    // tên, giá, đã bán, phút trước (thời điểm tạo), thêm
    ['Cơm gà xối mỡ', 40000, 30, 60],
    ['Cơm sườn nướng', 45000, 50, 50, { description: 'Sườn heo nướng than' }],
    ['Cơm chiên hải sản', 35000, 10, 40, { isAvailable: false }],
    ['Cà phê sữa đá', 25000, 80, 30],
    ['Bạc xỉu', 28000, 20, 20],
    ['Trà đào cam sả', 32000, 5, 10, { isFeatured: true }],
    ['Phở bò tái', 50000, 0, 5],
  ];
  for (const [name, price, soldCount, minutesAgo, extra] of rows) {
    const isDrink = /Cà phê|Bạc xỉu|Trà/.test(name);
    await prisma.menuItem.create({
      data: {
        stallId: stall.id, categoryId: isDrink ? drinks.id : rice.id, name, price: new Prisma.Decimal(price), soldCount,
        createdAt: new Date(Date.now() - minutesAgo * 60_000), ...extra,
      },
    });
  }
}

const list = (query: Record<string, string | number | boolean>) => request(app).get(`${API}/menu-items`).query(query);
const names = (res: request.Response) => res.body.data.map((i: { name: string }) => i.name);

describe('Tìm kiếm không dấu', () => {
  it('không dấu, viết hoa, có dấu đều ra cùng kết quả', async () => {
    await seed();
    for (const q of ['ca phe', 'CA PHE', 'cà phê', 'Cà Phê']) {
      expect(names(await list({ q })), q).toEqual(['Cà phê sữa đá']);
    }
    expect(names(await list({ q: 'PHỞ' }))).toEqual(['Phở bò tái']);
    expect(names(await list({ q: 'suon nuong' }))).toEqual(['Cơm sườn nướng']);
  });

  it('tìm cả trong mô tả món', async () => {
    await seed();
    expect(names(await list({ q: 'than' }))).toEqual(['Cơm sườn nướng']); // "nướng than" trong mô tả
  });

  it('từ khoá quá 100 ký tự → 400', async () => {
    expect((await list({ q: 'a'.repeat(101) })).status).toBe(400);
  });
});

describe('Sắp xếp', () => {
  it('mặc định "bán chạy" (soldCount giảm dần)', async () => {
    await seed();
    expect(names(await list({})).slice(0, 3)).toEqual(['Cà phê sữa đá', 'Cơm sườn nướng', 'Cơm gà xối mỡ']);
  });

  it('theo tên (A→Z tiếng Việt) và mới nhất', async () => {
    await seed();
    expect(names(await list({ sort: 'name' }))).toEqual([
      'Bạc xỉu', 'Cà phê sữa đá', 'Cơm chiên hải sản', 'Cơm gà xối mỡ', 'Cơm sườn nướng', 'Phở bò tái', 'Trà đào cam sả',
    ]);
    expect(names(await list({ sort: 'newest' })).slice(0, 2)).toEqual(['Phở bò tái', 'Trà đào cam sả']);
  });

  it('kiểu sắp xếp không hỗ trợ → 400', async () => {
    expect((await list({ sort: 'random' })).status).toBe(400);
  });
});

describe('Lọc kết hợp', () => {
  it('danh mục + khoảng giá + còn hàng + từ khoá cùng lúc', async () => {
    await seed();
    const res = await list({ category: 'com', minPrice: 30000, maxPrice: 45000, available: true, q: 'com' });
    expect(names(res).sort()).toEqual(['Cơm gà xối mỡ', 'Cơm sườn nướng']); // "Cơm chiên hải sản" hết món
  });

  it('lọc theo slug quầy và món đề xuất', async () => {
    await seed();
    expect(names(await list({ stall: 'bep-test', featured: true }))).toEqual(['Trà đào cam sả']);
    expect(names(await list({ stall: 'quay-khong-ton-tai' }))).toEqual([]);
  });
});

describe('Phân trang', () => {
  it('trả meta đúng (page, pageSize, total, totalPages)', async () => {
    await seed();
    const p1 = await list({ pageSize: 3, page: 1, sort: 'name' });
    const p3 = await list({ pageSize: 3, page: 3, sort: 'name' });
    expect(p1.body.meta).toEqual({ page: 1, pageSize: 3, total: 7, totalPages: 3 });
    expect(names(p1)).toEqual(['Bạc xỉu', 'Cà phê sữa đá', 'Cơm chiên hải sản']);
    expect(names(p3)).toEqual(['Trà đào cam sả']);
  });

  it('trang vượt quá → danh sách rỗng (không lỗi); pageSize > 48 hoặc page < 1 → 400', async () => {
    await seed();
    const beyond = await list({ pageSize: 3, page: 10 });
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
    expect((await list({ pageSize: 49 })).status).toBe(400);
    expect((await list({ page: 0 })).status).toBe(400);
  });

  it('các trang không trùng / không sót món (sắp xếp ổn định khi bằng nhau)', async () => {
    await seed();
    await prisma.menuItem.updateMany({ data: { soldCount: 0 } }); // tất cả cùng soldCount
    const seen: string[] = [];
    for (let page = 1; page <= 3; page++) seen.push(...names(await list({ pageSize: 3, page })));
    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
  });
});

describe('Index và collation trong database', () => {
  it('bảng menu_items có đủ index cho lọc / sắp xếp', async () => {
    const rows = await prisma.$queryRawUnsafe<{ Key_name: string }[]>('SHOW INDEX FROM menu_items');
    const keys = new Set(rows.map((r) => r.Key_name));
    for (const k of ['menu_items_stallId_isActive_isAvailable_idx', 'menu_items_categoryId_idx', 'menu_items_price_idx', 'menu_items_name_idx', 'menu_items_soldCount_idx']) {
      expect(keys.has(k), k).toBe(true);
    }
  });

  it('cột tên và mô tả dùng collation utf8mb4_unicode_ci (so sánh không phân biệt dấu)', async () => {
    const rows = await prisma.$queryRawUnsafe<{ c: string; k: string }[]>(
      "SELECT COLUMN_NAME c, COLLATION_NAME k FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME IN ('name', 'description')",
    );
    expect(rows.map((r) => r.k)).toEqual(['utf8mb4_unicode_ci', 'utf8mb4_unicode_ci']);
  });
});
