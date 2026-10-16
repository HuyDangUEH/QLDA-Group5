import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { API, app, prisma, request, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

/** Dữ liệu mẫu nhỏ, đủ để kiểm tra từng bộ lọc */
async function seedCatalog() {
  const drinks = await prisma.foodCategory.create({ data: { name: 'Đồ uống', slug: 'do-uong', sortOrder: 2 } });
  const noodles = await prisma.foodCategory.create({ data: { name: 'Bún – Phở', slug: 'bun-pho', sortOrder: 1 } });
  const hidden = await prisma.foodCategory.create({ data: { name: 'Ẩn', slug: 'an', isActive: false } });

  // Quầy mở cả ngày (openTime = closeTime) để test không phụ thuộc giờ chạy
  const open = await prisma.foodStall.create({
    data: { name: 'Phở Cô Ba', slug: 'pho-co-ba', location: 'Tòa A', openTime: '00:00', closeTime: '00:00' },
  });
  const closedStall = await prisma.foodStall.create({
    data: { name: 'Quầy Ngừng Bán', slug: 'quay-ngung', location: 'Tòa B', isActive: false },
  });

  const item = (data: Partial<Prisma.MenuItemUncheckedCreateInput> & { name: string; price: number }) =>
    prisma.menuItem.create({
      data: { stallId: open.id, categoryId: noodles.id, ...data, price: new Prisma.Decimal(data.price) },
    });

  const pho = await item({ name: 'Phở bò tái', description: 'Nước dùng thanh ngọt', price: 45000, soldCount: 50, isFeatured: true });
  const bun = await item({ name: 'Bún chả', price: 40000, soldCount: 80 });
  const tea = await item({ name: 'Trà sữa trân châu', categoryId: drinks.id, price: 30000, soldCount: 10 });
  const soldOut = await item({ name: 'Cà phê sữa', categoryId: drinks.id, price: 25000, isAvailable: false });
  await item({ name: 'Món đã ngừng bán', price: 20000, isActive: false });
  await item({ name: 'Món của danh mục ẩn', categoryId: hidden.id, price: 20000 });
  await item({ name: 'Phở của quầy ngừng', stallId: closedStall.id, price: 20000 });

  return { drinks, noodles, open, closedStall, pho, bun, tea, soldOut };
}

const names = (res: request.Response) => res.body.data.map((i: { name: string }) => i.name);

describe('GET /menu-items', () => {
  it('chỉ trả món đang bán của quầy & danh mục đang hoạt động, mặc định sắp xếp bán chạy', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/menu-items`);
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['Bún chả', 'Phở bò tái', 'Trà sữa trân châu', 'Cà phê sữa']);
    expect(res.body.meta.total).toBe(4);
  });

  it('tìm kiếm không phân biệt dấu và hoa thường ("pho" → "Phở")', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/menu-items?q=PHO`);
    expect(names(res)).toEqual(['Phở bò tái']);
  });

  it('tìm trong mô tả', async () => {
    await seedCatalog();
    expect(names(await request(app).get(`${API}/menu-items?q=thanh ngot`))).toEqual(['Phở bò tái']);
  });

  it('lọc theo danh mục (ID và slug), quầy, khoảng giá, còn hàng', async () => {
    const { drinks, open } = await seedCatalog();
    expect(names(await request(app).get(`${API}/menu-items?categoryId=${drinks.id}`)).sort()).toEqual(['Cà phê sữa', 'Trà sữa trân châu']);
    expect(names(await request(app).get(`${API}/menu-items?category=do-uong&available=true`))).toEqual(['Trà sữa trân châu']);
    expect((await request(app).get(`${API}/menu-items?stall=${open.slug}`)).body.meta.total).toBe(4);
    expect(names(await request(app).get(`${API}/menu-items?minPrice=30000&maxPrice=40000&sort=price_asc`))).toEqual([
      'Trà sữa trân châu',
      'Bún chả',
    ]);
  });

  it('sắp xếp theo giá giảm dần và lọc món đề xuất', async () => {
    await seedCatalog();
    expect(names(await request(app).get(`${API}/menu-items?sort=price_desc`))[0]).toBe('Phở bò tái');
    expect(names(await request(app).get(`${API}/menu-items?featured=true`))).toEqual(['Phở bò tái']);
  });

  it('phân trang', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/menu-items?pageSize=3&page=2`);
    expect(names(res)).toEqual(['Cà phê sữa']);
    expect(res.body.meta).toEqual({ page: 2, pageSize: 3, total: 4, totalPages: 2 });
  });

  it('trả giá dạng chuỗi decimal và cờ canOrder', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/menu-items?sort=price_asc`);
    const coffee = res.body.data.find((i: { name: string }) => i.name === 'Cà phê sữa');
    const tea = res.body.data.find((i: { name: string }) => i.name === 'Trà sữa trân châu');
    expect(coffee).toMatchObject({ price: '25000', isAvailable: false, canOrder: false });
    expect(tea).toMatchObject({ price: '30000', canOrder: true, stall: { slug: 'pho-co-ba', isOpenNow: true } });
  });

  it('tham số không hợp lệ → 400', async () => {
    expect((await request(app).get(`${API}/menu-items?minPrice=50000&maxPrice=10000`)).status).toBe(400);
    expect((await request(app).get(`${API}/menu-items?sort=random`)).status).toBe(400);
    expect((await request(app).get(`${API}/menu-items?pageSize=1000`)).status).toBe(400);
  });
});

describe('GET /menu-items/:id', () => {
  it('chi tiết món kèm món gợi ý cùng quầy', async () => {
    const { pho } = await seedCatalog();
    const res = await request(app).get(`${API}/menu-items/${pho.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.item).toMatchObject({ name: 'Phở bò tái', stall: { location: 'Tòa A' } });
    expect(res.body.data.related.map((i: { name: string }) => i.name)).not.toContain('Phở bò tái');
    expect(res.body.data.related.length).toBeGreaterThan(0);
  });

  it('món đã ngừng bán hoặc không tồn tại → 404', async () => {
    await seedCatalog();
    const inactive = await prisma.menuItem.findFirstOrThrow({ where: { name: 'Món đã ngừng bán' } });
    expect((await request(app).get(`${API}/menu-items/${inactive.id}`)).status).toBe(404);
    expect((await request(app).get(`${API}/menu-items/999999`)).status).toBe(404);
    expect((await request(app).get(`${API}/menu-items/abc`)).status).toBe(400);
  });
});

describe('Quầy ăn, danh mục, trang chủ', () => {
  it('GET /stalls chỉ trả quầy đang hoạt động, kèm điểm đánh giá', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/stalls`);
    expect(res.body.data.map((s: { slug: string }) => s.slug)).toEqual(['pho-co-ba']);
    expect(res.body.data[0]).toMatchObject({ isOpenNow: true, canOrderNow: true, rating: { average: null, count: 0 } });
  });

  it('GET /stalls/:slug và /stalls/:id trả thực đơn nhóm theo danh mục', async () => {
    const { open } = await seedCatalog();
    const bySlug = await request(app).get(`${API}/stalls/pho-co-ba`);
    const byId = await request(app).get(`${API}/stalls/${open.id}`);
    expect(bySlug.status).toBe(200);
    expect(byId.body.data.stall.id).toBe(open.id);
    // Danh mục theo sortOrder: Bún – Phở (1) trước Đồ uống (2)
    expect(bySlug.body.data.categories.map((c: { slug: string }) => c.slug)).toEqual(['bun-pho', 'do-uong']);
    expect(bySlug.body.data.menuItems).toHaveLength(4);
  });

  it('quầy ngừng hoạt động → 404', async () => {
    await seedCatalog();
    expect((await request(app).get(`${API}/stalls/quay-ngung`)).status).toBe(404);
  });

  it('quầy tạm ngưng nhận đơn: món vẫn hiển thị nhưng canOrder = false', async () => {
    const { open } = await seedCatalog();
    await prisma.foodStall.update({ where: { id: open.id }, data: { isAcceptingOrders: false } });
    const res = await request(app).get(`${API}/stalls/pho-co-ba`);
    expect(res.body.data.stall.canOrderNow).toBe(false);
    expect(res.body.data.menuItems.every((i: { canOrder: boolean }) => !i.canOrder)).toBe(true);
  });

  it('GET /categories đếm đúng số món đang bán', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/categories`);
    expect(res.body.data).toEqual([
      expect.objectContaining({ slug: 'bun-pho', itemCount: 2 }),
      expect.objectContaining({ slug: 'do-uong', itemCount: 2 }),
    ]);
  });

  it('GET /home gom đủ các phần của trang chủ', async () => {
    await seedCatalog();
    const res = await request(app).get(`${API}/home`);
    expect(res.status).toBe(200);
    expect(res.body.data.popularItems[0].name).toBe('Bún chả');
    expect(res.body.data.popularItems.map((i: { name: string }) => i.name)).not.toContain('Cà phê sữa');
    expect(res.body.data.featuredItems.map((i: { name: string }) => i.name)).toEqual(['Phở bò tái']);
    expect(res.body.data.featuredStalls).toHaveLength(1);
    expect(res.body.data.promotions.length).toBeGreaterThan(0);
  });
});
