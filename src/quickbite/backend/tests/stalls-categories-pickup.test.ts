import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { API, app, createUser, prisma, request, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

/** "HH:mm" theo giờ Việt Nam, lệch `offsetMinutes` so với hiện tại */
function vnTime(offsetMinutes: number) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

async function seed() {
  const rice = await prisma.foodCategory.create({ data: { name: 'Cơm', slug: 'com', sortOrder: 1 } });
  const drinks = await prisma.foodCategory.create({ data: { name: 'Đồ uống', slug: 'do-uong', sortOrder: 2 } });
  await prisma.foodCategory.create({ data: { name: 'Ăn vặt', slug: 'an-vat', sortOrder: 3 } }); // chưa có món
  await prisma.foodCategory.create({ data: { name: 'Danh mục ẩn', slug: 'an', sortOrder: 0, isActive: false } });

  const owner = await createUser({ role: 'VENDOR', email: 'chu.quay@test.local' });
  const bep = await prisma.foodStall.create({
    data: {
      name: 'Bếp Nhà Sinh Viên', slug: 'bep-nha-sinh-vien', description: 'Cơm nhà nấu', location: 'Căn tin tòa A', openTime: '00:00', closeTime: '00:00',
      bankBin: '970436', bankAccountNo: '1023456789', bankAccountName: 'BEP NHA SINH VIEN',
      memberships: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });
  const tra = await prisma.foodStall.create({ data: { name: 'Trà Sữa Chill', slug: 'tra-sua-chill', description: 'Trà sữa, cà phê', location: 'Thư viện', openTime: '00:00', closeTime: '00:00' } });
  // Quầy đang ngoài giờ mở cửa: mở sau 2 tiếng nữa, đóng sau 3 tiếng
  const late = await prisma.foodStall.create({ data: { name: 'Quầy Ăn Tối', slug: 'quay-an-toi', location: 'Ký túc xá', openTime: vnTime(120), closeTime: vnTime(180) } });

  const item = (stallId: number, categoryId: number, name: string, extra: Partial<Prisma.MenuItemUncheckedCreateInput> = {}) =>
    prisma.menuItem.create({ data: { stallId, categoryId, name, price: new Prisma.Decimal(35000), ...extra } });
  await item(bep.id, rice.id, 'Cơm gà');
  await item(bep.id, rice.id, 'Cơm sườn', { isAvailable: false }); // hết món: vẫn hiện, vẫn tính
  await item(bep.id, rice.id, 'Món đã ngừng bán', { isActive: false }); // không hiện, không tính
  await item(tra.id, drinks.id, 'Trà sữa');
  await item(late.id, rice.id, 'Cơm tối');

  const pickups = await Promise.all([
    prisma.campusPickupLocation.create({ data: { name: 'Căn tin cơ sở N', building: 'Cơ sở N', description: 'Quầy nhận món trong căn tin' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Cổng chính cơ sở B', building: 'Cơ sở B', description: 'Cạnh nhà bảo vệ' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Căn tin cơ sở B', building: 'Cơ sở B' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Nhà thi đấu (tạm đóng)', isActive: false } }),
  ]);
  return { rice, drinks, bep, tra, late, owner, pickups };
}

async function addReview(stallId: number, rating: number, status: 'VISIBLE' | 'HIDDEN' | 'REPORTED', name: string, minutesAgo: number) {
  const student = await createUser({ fullName: name });
  const order = await prisma.order.create({
    data: {
      orderNumber: `QB-T-${student.id}`, studentId: student.id, stallId, status: 'COMPLETED', subtotal: 35000, total: 35000,
      pickupLocationId: (await prisma.campusPickupLocation.findFirstOrThrow()).id,
    },
  });
  await prisma.review.create({
    data: { orderId: order.id, studentId: student.id, stallId, rating, status, comment: `Đánh giá của ${name}`, createdAt: new Date(Date.now() - minutesAgo * 60_000) },
  });
}

describe('GET /stalls — danh sách quầy', () => {
  it('công khai (không cần đăng nhập), sắp xếp theo tên, kèm số món đang bán', async () => {
    await seed();
    const res = await request(app).get(`${API}/stalls`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual(['Bếp Nhà Sinh Viên', 'Quầy Ăn Tối', 'Trà Sữa Chill']);
    expect(res.body.data[0]).toMatchObject({ menuItemCount: 2, acceptsVietQr: true, paymentTimeoutMinutes: 15 });
  });

  it('tìm theo tên / mô tả / vị trí, không phân biệt dấu và hoa thường', async () => {
    await seed();
    const search = async (q: string) => (await request(app).get(`${API}/stalls`).query({ q })).body.data.map((s: { slug: string }) => s.slug);
    expect(await search('bep')).toEqual(['bep-nha-sinh-vien']); // "bep" → "Bếp"
    expect(await search('CA PHE')).toEqual(['tra-sua-chill']); // tìm trong mô tả
    expect(await search('thu vien')).toEqual(['tra-sua-chill']); // tìm theo vị trí
    expect(await search('khong-co-quay-nay')).toEqual([]);
  });

  it('từ khoá quá dài → 400 tiếng Việt', async () => {
    const res = await request(app).get(`${API}/stalls`).query({ q: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('trạng thái mở cửa tính theo giờ Việt Nam: quầy ngoài giờ → isOpenNow / canOrderNow = false', async () => {
    await seed();
    const stalls = (await request(app).get(`${API}/stalls`)).body.data as { slug: string; isOpenNow: boolean; canOrderNow: boolean }[];
    expect(stalls.find((s) => s.slug === 'quay-an-toi')).toMatchObject({ isOpenNow: false, canOrderNow: false });
    expect(stalls.find((s) => s.slug === 'bep-nha-sinh-vien')).toMatchObject({ isOpenNow: true, canOrderNow: true });
  });

  it('KHÔNG lộ số tài khoản ngân hàng, nhân viên quầy hay email chủ quầy ra trang công khai', async () => {
    await seed();
    const list = JSON.stringify((await request(app).get(`${API}/stalls`)).body);
    const detail = JSON.stringify((await request(app).get(`${API}/stalls/bep-nha-sinh-vien`)).body);
    for (const body of [list, detail]) {
      expect(body).not.toMatch(/1023456789|bankAccount|bankBin|memberships|chu\.quay@test\.local/);
    }
  });
});

describe('GET /stalls/:idOrSlug — chi tiết quầy', () => {
  it('điểm đánh giá chỉ tính đánh giá công khai (bỏ đánh giá bị ẩn), làm tròn 1 chữ số', async () => {
    const { bep } = await seed();
    await addReview(bep.id, 5, 'VISIBLE', 'An', 30);
    await addReview(bep.id, 4, 'VISIBLE', 'Bình', 20);
    await addReview(bep.id, 4, 'REPORTED', 'Cường', 10); // bị báo cáo nhưng chưa xử lý → vẫn công khai
    await addReview(bep.id, 1, 'HIDDEN', 'Dũng', 5); // admin đã ẩn → không tính

    const res = await request(app).get(`${API}/stalls/bep-nha-sinh-vien`);
    expect(res.body.data.stall.rating).toEqual({ average: 4.3, count: 3 });
    expect(res.body.data.reviews.map((r: { author: string }) => r.author)).toEqual(['Cường', 'Bình', 'An']); // mới nhất trước
    expect(JSON.stringify(res.body.data.reviews)).not.toMatch(/Dũng|@test\.local/); // không có đánh giá ẩn, không lộ email
  });

  it('chỉ hiện tối đa 5 đánh giá gần nhất', async () => {
    const { bep } = await seed();
    for (let i = 1; i <= 7; i++) await addReview(bep.id, 5, 'VISIBLE', `Sinh viên ${i}`, 100 - i);
    const res = await request(app).get(`${API}/stalls/bep-nha-sinh-vien`);
    expect(res.body.data.reviews).toHaveLength(5);
    expect(res.body.data.stall.rating.count).toBe(7);
  });

  it('thực đơn: món hết hàng vẫn hiện (canOrder = false), món ngừng bán không hiện', async () => {
    await seed();
    const items = (await request(app).get(`${API}/stalls/bep-nha-sinh-vien`)).body.data.menuItems as { name: string; isAvailable: boolean; canOrder: boolean }[];
    expect(items.map((i) => i.name).sort()).toEqual(['Cơm gà', 'Cơm sườn']);
    expect(items.find((i) => i.name === 'Cơm sườn')).toMatchObject({ isAvailable: false, canOrder: false });
  });

  it('không tồn tại → 404 tiếng Việt', async () => {
    await seed();
    const res = await request(app).get(`${API}/stalls/khong-ton-tai`);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Không tìm thấy quầy ăn');
    expect((await request(app).get(`${API}/stalls/999999`)).status).toBe(404);
  });
});

describe('GET /categories — danh mục', () => {
  it('chỉ danh mục đang hoạt động, theo thứ tự sortOrder, kèm số món; danh mục chưa có món vẫn hiện (0 món)', async () => {
    await seed();
    const res = await request(app).get(`${API}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { slug: string; itemCount: number }) => [c.slug, c.itemCount])).toEqual([
      ['com', 3], // Cơm gà, Cơm sườn (hết món vẫn tính), Cơm tối — không tính món đã ngừng bán
      ['do-uong', 1],
      ['an-vat', 0],
    ]);
  });

  it('không trả các trường nội bộ (isActive, createdAt, updatedAt)', async () => {
    await seed();
    const [first] = (await request(app).get(`${API}/categories`)).body.data;
    expect(Object.keys(first).sort()).toEqual(['description', 'icon', 'id', 'itemCount', 'name', 'slug', 'sortOrder']);
  });
});

describe('GET /pickup-locations — điểm nhận món', () => {
  it('công khai, chỉ điểm đang hoạt động, sắp xếp theo tên, chỉ trả các trường cần thiết', async () => {
    await seed();
    const res = await request(app).get(`${API}/pickup-locations`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { name: string }) => l.name)).toEqual(['Căn tin cơ sở B', 'Căn tin cơ sở N', 'Cổng chính cơ sở B']);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['building', 'description', 'id', 'name']);
  });

  it('điểm nhận bị tắt thì không đặt món tới đó được (đã kiểm tra ở API tạo đơn)', async () => {
    const { pickups } = await seed();
    const closed = pickups[3]!;
    const list = (await request(app).get(`${API}/pickup-locations`)).body.data as { id: number }[];
    expect(list.map((l) => l.id)).not.toContain(closed.id);
  });
});
