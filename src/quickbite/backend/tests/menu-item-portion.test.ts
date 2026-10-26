import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { API, app, createStall, createUser, loginAs, prisma, request, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function setup() {
  const owner = await createUser({ role: 'VENDOR', email: 'owner@test.local' });
  const stall = await createStall('Quầy A', [{ userId: owner.id }]);
  await prisma.foodStall.update({ where: { id: stall.id }, data: { openTime: '00:00', closeTime: '00:00' } });
  const category = await prisma.foodCategory.create({ data: { name: 'Bún – Phở', slug: 'bun-pho' } });
  const pho = await prisma.menuItem.create({
    data: { stallId: stall.id, categoryId: category.id, name: 'Phở bò tái', price: new Prisma.Decimal(45000), portion: '1 tô · 650ml' },
  });
  const noPortion = await prisma.menuItem.create({ data: { stallId: stall.id, categoryId: category.id, name: 'Quẩy', price: new Prisma.Decimal(5000) } });
  const agent = await loginAs('owner@test.local');
  return { stall, category, pho, noPortion, agent, base: `${API}/vendor/stalls/${stall.id}` };
}

describe('Định lượng món ăn (portion)', () => {
  it('API chi tiết món trả định lượng; món chưa nhập trả null', async () => {
    const { pho, noPortion } = await setup();
    expect((await request(app).get(`${API}/menu-items/${pho.id}`)).body.data.item.portion).toBe('1 tô · 650ml');
    expect((await request(app).get(`${API}/menu-items/${noPortion.id}`)).body.data.item.portion).toBeNull();
  });

  it('danh sách món và trang quầy cũng có định lượng', async () => {
    const { pho, stall } = await setup();
    const list = (await request(app).get(`${API}/menu-items`)).body.data;
    expect(list.find((i: { id: number }) => i.id === pho.id).portion).toBe('1 tô · 650ml');
    const detail = (await request(app).get(`${API}/stalls/${stall.slug}`)).body.data;
    expect(detail.menuItems.find((i: { id: number }) => i.id === pho.id).portion).toBe('1 tô · 650ml');
  });

  it('chủ quầy thêm món kèm định lượng (tự bỏ khoảng trắng thừa)', async () => {
    const { agent, base, category } = await setup();
    const res = await agent.post(`${base}/menu-items`).send({ name: 'Há cảo hấp', price: 30000, categoryId: category.id, portion: '  6 viên  ' });
    expect(res.status).toBe(201);
    expect(res.body.data.portion).toBe('6 viên');
  });

  it('chủ quầy sửa định lượng; gửi chuỗi rỗng → xoá định lượng; không gửi → giữ nguyên', async () => {
    const { agent, base, pho } = await setup();
    expect((await agent.patch(`${base}/menu-items/${pho.id}`).send({ portion: '1 tô lớn · 800ml' })).body.data.portion).toBe('1 tô lớn · 800ml');
    expect((await agent.patch(`${base}/menu-items/${pho.id}`).send({ price: 50000 })).body.data.portion).toBe('1 tô lớn · 800ml');
    expect((await agent.patch(`${base}/menu-items/${pho.id}`).send({ portion: '' })).body.data.portion).toBeNull();
  });

  it('định lượng quá 60 ký tự → 400 tiếng Việt', async () => {
    const { agent, base, category } = await setup();
    const res = await agent.post(`${base}/menu-items`).send({ name: 'Món dài', price: 30000, categoryId: category.id, portion: 'x'.repeat(61) });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'portion', message: 'Định lượng tối đa 60 ký tự' }]);
  });
});
