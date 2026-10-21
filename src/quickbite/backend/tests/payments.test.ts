import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { API, app, createStall, createUser, loginAs, prisma, request, resetDatabase } from './helpers.js';
import { buildVietQrPayload, crc16, extractTransferContent, normalizeAccountName, transferContentFor } from '../src/modules/payments/vietqr.js';
import { paymentsService } from '../src/modules/payments/payments.service.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const SEPAY_KEY = 'test_sepay_webhook_key_0123456789';
const BANK = { bankBin: '970436', accountNo: '0011001234567', accountName: 'Nguyễn Văn Đạt' };

/** 1 quầy mở cả ngày (có chủ + nhân viên), 1 món 35.000đ, 1 điểm nhận, 1 sinh viên */
async function setup({ withBank = true } = {}) {
  await createUser({ role: 'STUDENT', email: 'sv@test.local' });
  const owner = await createUser({ role: 'VENDOR', email: 'owner@test.local' });
  const staff = await createUser({ role: 'VENDOR', email: 'staff@test.local' });
  const stall = await createStall('Quầy A', [{ userId: owner.id }, { userId: staff.id, role: 'STAFF' }]);
  await prisma.foodStall.update({
    where: { id: stall.id },
    data: {
      openTime: '00:00',
      closeTime: '00:00',
      ...(withBank && { bankBin: BANK.bankBin, bankAccountNo: BANK.accountNo, bankAccountName: 'NGUYEN VAN DAT' }),
    },
  });
  const category = await prisma.foodCategory.create({ data: { name: 'Cơm', slug: 'com' } });
  const rice = await prisma.menuItem.create({ data: { stallId: stall.id, categoryId: category.id, name: 'Cơm gà', price: new Prisma.Decimal(35000) } });
  const pickup = await prisma.campusPickupLocation.create({ data: { name: 'Sảnh A1' } });
  const student = await loginAs('sv@test.local');
  return { stall, rice, pickup, student };
}

let keySeq = 0;
async function placeOrder(ctx: Awaited<ReturnType<typeof setup>>, paymentMethod: 'VIETQR' | 'CASH_ON_PICKUP' = 'VIETQR', quantity = 2) {
  await ctx.student.post(`${API}/cart/items`).send({ menuItemId: ctx.rice.id, quantity });
  return ctx.student.post(`${API}/orders`).send({ pickupLocationId: ctx.pickup.id, paymentMethod, idempotencyKey: `pay-key-${++keySeq}` });
}

const webhook = (body: Record<string, unknown>, key = SEPAY_KEY) =>
  request(app).post(`${API}/payments/sepay/webhook`).set('Authorization', `Apikey ${key}`).send(body);

const sepayTx = (content: string, amount: number, extra: Record<string, unknown> = {}) => ({
  id: 92704 + ++keySeq,
  gateway: 'Vietcombank',
  transactionDate: '2026-10-20 10:15:00',
  accountNumber: BANK.accountNo,
  code: null,
  content,
  transferType: 'in',
  transferAmount: amount,
  accumulated: 1_000_000,
  referenceCode: 'FT26293123456',
  description: '',
  ...extra,
});

describe('Mã VietQR', () => {
  it('CRC16-CCITT đúng chuẩn (giá trị kiểm tra "123456789" = 29B1)', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('tạo chuỗi EMVCo có ngân hàng, tài khoản, số tiền, nội dung và CRC hợp lệ', () => {
    const payload = buildVietQrPayload({ bankBin: '970436', accountNo: '0011001234567', amount: 70000, content: 'QB2610204F7K' });
    expect(payload.startsWith('000201010212')).toBe(true);
    expect(payload).toContain('0010A000000727');
    expect(payload).toContain('0006970436'); // BIN ngân hàng
    expect(payload).toContain('01130011001234567'); // số tài khoản
    expect(payload).toContain('0208QRIBFTTA');
    expect(payload).toContain('5303704540570000'); // VND + số tiền 70000
    expect(payload).toContain('5802VN');
    expect(payload).toContain('62160812QB2610204F7K');
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it('từ chối dữ liệu sai (số tiền âm, nội dung có dấu)', () => {
    expect(() => buildVietQrPayload({ bankBin: '970436', accountNo: '123456', amount: -1, content: 'QB1' })).toThrow();
    expect(() => buildVietQrPayload({ bankBin: '970436', accountNo: '123456', amount: 1000, content: 'Trả tiền' })).toThrow();
  });

  it('nhận ra mã đơn trong nội dung ngân hàng gửi về dù bị thêm/bớt ký tự', () => {
    const code = transferContentFor('QB-261020-4F7K');
    expect(code).toBe('QB2610204F7K');
    expect(extractTransferContent('MBVCB.1234.QB2610204F7K.CT tu 0123 NGUYEN VAN A')).toBe(code);
    expect(extractTransferContent('qb-261020-4f7k thanh toan')).toBe(code);
    expect(extractTransferContent('chuyen tien an trua')).toBeNull();
  });

  it('chuẩn hoá tên chủ tài khoản: bỏ dấu, viết hoa', () => {
    expect(normalizeAccountName('  Nguyễn   Văn Đạt ')).toBe('NGUYEN VAN DAT');
  });
});

describe('Cài tài khoản nhận tiền của quầy', () => {
  it('chủ quầy lưu tài khoản (tên tự chuẩn hoá), trang công khai chỉ thấy acceptsVietQr', async () => {
    const { stall } = await setup({ withBank: false });
    const owner = await loginAs('owner@test.local');
    const res = await owner.patch(`${API}/vendor/stalls/${stall.id}`).send({ bankAccount: BANK });
    expect(res.status).toBe(200);
    expect(res.body.data.stall).toMatchObject({ bankBin: '970436', bankAccountNo: BANK.accountNo, bankAccountName: 'NGUYEN VAN DAT', acceptsVietQr: true });

    const pub = await request(app).get(`${API}/stalls/${stall.slug}`);
    expect(pub.body.data.stall.acceptsVietQr).toBe(true);
    expect(JSON.stringify(pub.body)).not.toContain(BANK.accountNo);

    const off = await owner.patch(`${API}/vendor/stalls/${stall.id}`).send({ bankAccount: null });
    expect(off.body.data.stall).toMatchObject({ bankBin: null, acceptsVietQr: false });
  });

  it('ngân hàng không hỗ trợ / số tài khoản sai → 400; nhân viên (không phải chủ) → 403', async () => {
    const { stall } = await setup({ withBank: false });
    const owner = await loginAs('owner@test.local');
    expect((await owner.patch(`${API}/vendor/stalls/${stall.id}`).send({ bankAccount: { ...BANK, bankBin: '123456' } })).status).toBe(400);
    expect((await owner.patch(`${API}/vendor/stalls/${stall.id}`).send({ bankAccount: { ...BANK, accountNo: '12 34' } })).status).toBe(400);
    const staff = await loginAs('staff@test.local');
    expect((await staff.patch(`${API}/vendor/stalls/${stall.id}`).send({ bankAccount: BANK })).status).toBe(403);
  });

  it('danh sách ngân hàng công khai', async () => {
    const res = await request(app).get(`${API}/payments/banks`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ bin: '970436', shortName: 'Vietcombank' })]));
  });
});

describe('Đặt đơn chuyển khoản VietQR', () => {
  it('quầy chưa cài tài khoản → 422 và giỏ hàng vẫn còn', async () => {
    const ctx = await setup({ withBank: false });
    const res = await placeOrder(ctx);
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'paymentMethod' })]);
    expect((await ctx.student.get(`${API}/cart`)).body.data.itemCount).toBe(2);
  });

  it('tạo đơn chờ thanh toán, trả về mã QR theo tài khoản quầy và số tiền tính ở server', async () => {
    const ctx = await setup();
    const res = await placeOrder(ctx);
    expect(res.status).toBe(201);
    const { order } = res.body.data;
    expect(order).toMatchObject({ paymentMethod: 'VIETQR', paymentStatus: 'UNPAID', status: 'PENDING', total: '70000', awaitingPayment: true, canCancel: true });
    expect(order.vietQr).toMatchObject({
      bankShortName: 'Vietcombank',
      accountNo: BANK.accountNo,
      accountName: 'NGUYEN VAN DAT',
      amount: '70000',
      content: transferContentFor(order.orderNumber),
    });
    expect(order.vietQr.qrPayload).toContain('540570000');
    expect(new Date(order.vietQr.expiresAt).getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);

    // Quầy đổi tài khoản sau khi đặt: đơn cũ vẫn giữ tài khoản cũ
    await prisma.foodStall.update({ where: { id: ctx.stall.id }, data: { bankAccountNo: '9999999999' } });
    expect((await ctx.student.get(`${API}/orders/${order.id}`)).body.data.order.vietQr.accountNo).toBe(BANK.accountNo);
  });

  it('quầy chưa được nhận đơn khi chưa nhận tiền; chỉ được từ chối', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    const owner = await loginAs('owner@test.local');

    const detail = await owner.get(`${API}/vendor/stalls/${ctx.stall.id}/orders/${order.id}`);
    expect(detail.body.data.order.nextStatuses).toEqual(['REJECTED']);
    const list = await owner.get(`${API}/vendor/stalls/${ctx.stall.id}/orders?tab=new`);
    expect(list.body.data[0]).toMatchObject({ awaitingPayment: true, paymentMethod: 'VIETQR' });

    const accept = await owner.patch(`${API}/vendor/stalls/${ctx.stall.id}/orders/${order.id}/status`).send({ status: 'ACCEPTED' });
    expect(accept.status).toBe(422);
  });
});

describe('Webhook SePay', () => {
  it('thiếu hoặc sai API key → 401', async () => {
    expect((await request(app).post(`${API}/payments/sepay/webhook`).send({})).status).toBe(401);
    expect((await webhook(sepayTx('QB2610204F7K', 1000), 'sai_khoa_sai_khoa_sai_khoa')).status).toBe(401);
  });

  it('khớp nội dung + đủ tiền → đơn đã thanh toán, có thông báo; gửi lại không xử lý lần hai', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    const tx = sepayTx(`MBVCB.998877.${order.vietQr.content}.CT tu NGUYEN VAN A`, 70000);

    const first = await webhook(tx);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ success: true, data: { matched: true, orderNumber: order.orderNumber } });

    const paid = (await ctx.student.get(`${API}/orders/${order.id}`)).body.data.order;
    expect(paid).toMatchObject({ paymentStatus: 'PAID', awaitingPayment: false, canCancel: false });
    expect(paid.vietQr).toMatchObject({ confirmedBy: 'SEPAY', qrPayload: null });
    expect(await prisma.notification.count({ where: { orderId: order.id, title: { contains: 'thanh toán' } } })).toBe(3); // SV + chủ + nhân viên

    expect((await webhook(tx)).body.data).toMatchObject({ matched: true, reason: 'ALREADY_PAID' });
    expect((await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } })).providerRef).toBe(`SEPAY-${tx.id}`);

    // Đã thanh toán: quầy nhận đơn được, sinh viên không tự huỷ được
    const owner = await loginAs('owner@test.local');
    expect((await owner.patch(`${API}/vendor/stalls/${ctx.stall.id}/orders/${order.id}/status`).send({ status: 'ACCEPTED' })).status).toBe(200);
    expect((await ctx.student.post(`${API}/orders/${order.id}/cancel`).send({})).status).toBe(422);
  });

  it('chuyển thiếu tiền, sai tài khoản, tiền ra, không có mã đơn → không xác nhận', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    const content = order.vietQr.content;

    expect((await webhook(sepayTx(content, 69000))).body.data.reason).toBe('AMOUNT_TOO_LOW');
    expect((await webhook(sepayTx(content, 70000, { accountNumber: '123123123' }))).body.data.reason).toBe('ACCOUNT_MISMATCH');
    expect((await webhook(sepayTx(content, 70000, { transferType: 'out' }))).body.data.reason).toBe('NOT_INCOMING');
    expect((await webhook(sepayTx('tra tien com', 70000))).body.data.reason).toBe('NO_ORDER_CODE');
    expect((await webhook(sepayTx('QB2610209ZZZ', 70000))).body.data.reason).toBe('ORDER_NOT_FOUND');

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe('UNPAID');
  });

  it('hoàn thành đơn chuyển khoản giữ nguyên thông tin xác nhận SePay', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    await webhook(sepayTx(order.vietQr.content, 70000));
    const owner = await loginAs('owner@test.local');
    for (const status of ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED']) {
      expect((await owner.patch(`${API}/vendor/stalls/${ctx.stall.id}/orders/${order.id}/status`).send({ status })).status).toBe(200);
    }
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment).toMatchObject({ status: 'PAID', provider: 'SEPAY', confirmedById: null });
  });
});

describe('Quầy tự xác nhận đã nhận tiền', () => {
  it('nhân viên quầy xác nhận được một lần; đơn tiền mặt không dùng được', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    const staff = await loginAs('staff@test.local');
    const url = `${API}/vendor/stalls/${ctx.stall.id}/orders/${order.id}/confirm-payment`;

    const res = await staff.post(url);
    expect(res.status).toBe(200);
    expect(res.body.data.order).toMatchObject({ paymentStatus: 'PAID', nextStatuses: ['ACCEPTED', 'REJECTED'] });
    expect(res.body.data.order.vietQr.confirmedBy).toBe('MANUAL');
    expect((await staff.post(url)).status).toBe(409);

    const cash = (await placeOrder(ctx, 'CASH_ON_PICKUP')).body.data.order;
    expect((await staff.post(`${API}/vendor/stalls/${ctx.stall.id}/orders/${cash.id}/confirm-payment`)).status).toBe(422);
  });

  it('sinh viên và quầy khác không xác nhận được', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    expect((await ctx.student.post(`${API}/vendor/stalls/${ctx.stall.id}/orders/${order.id}/confirm-payment`)).status).toBe(403);

    const other = await createUser({ role: 'VENDOR', email: 'other@test.local' });
    const otherStall = await createStall('Quầy B', [{ userId: other.id }]);
    const otherAgent = await loginAs('other@test.local');
    expect((await otherAgent.post(`${API}/vendor/stalls/${otherStall.id}/orders/${order.id}/confirm-payment`)).status).toBe(404);
  });
});

describe('Số phút chờ chuyển khoản', () => {
  it('chủ quầy chọn số phút (5–60); đơn mới dùng đúng hạn đó; trang công khai hiện số phút', async () => {
    const ctx = await setup();
    const owner = await loginAs('owner@test.local');
    expect((await owner.patch(`${API}/vendor/stalls/${ctx.stall.id}`).send({ paymentTimeoutMinutes: 3 })).status).toBe(400);
    expect((await owner.patch(`${API}/vendor/stalls/${ctx.stall.id}`).send({ paymentTimeoutMinutes: 61 })).status).toBe(400);
    const res = await owner.patch(`${API}/vendor/stalls/${ctx.stall.id}`).send({ paymentTimeoutMinutes: 30 });
    expect(res.body.data.stall.paymentTimeoutMinutes).toBe(30);
    expect((await request(app).get(`${API}/stalls/${ctx.stall.slug}`)).body.data.stall.paymentTimeoutMinutes).toBe(30);

    const before = Date.now();
    const { order } = (await placeOrder(ctx)).body.data;
    const ms = new Date(order.vietQr.expiresAt).getTime() - before;
    expect(ms).toBeGreaterThan(29 * 60_000);
    expect(ms).toBeLessThanOrEqual(30 * 60_000 + 5_000);
    const note = await prisma.notification.findFirstOrThrow({ where: { orderId: order.id, title: { startsWith: 'Đặt món thành công' } } });
    expect(note.message).toContain('30 phút');
  });

  it('hết giờ: mở đơn là thấy đơn đã huỷ ngay (không chờ tác vụ định kỳ)', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    await prisma.payment.update({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const seen = (await ctx.student.get(`${API}/orders/${order.id}`)).body.data.order;
    expect(seen).toMatchObject({ status: 'CANCELLED', paymentStatus: 'VOIDED', awaitingPayment: false, cancelReason: 'Quá hạn thanh toán chuyển khoản' });
    expect(seen.vietQr.qrPayload).toBeNull();

    // Quầy cũng không còn thấy đơn trong tab "Đơn mới"
    const owner = await loginAs('owner@test.local');
    expect((await owner.get(`${API}/vendor/stalls/${ctx.stall.id}/orders?tab=new`)).body.data).toHaveLength(0);
  });
});

describe('Huỷ đơn chuyển khoản quá hạn', () => {
  it('đơn chưa trả quá hạn bị huỷ; đơn đã trả hoặc chưa hết hạn giữ nguyên', async () => {
    const ctx = await setup();
    const expired = (await placeOrder(ctx)).body.data.order;
    const paid = (await placeOrder(ctx)).body.data.order;
    const fresh = (await placeOrder(ctx)).body.data.order;
    const past = new Date(Date.now() - 60_000);
    await prisma.payment.updateMany({ where: { orderId: { in: [expired.id, paid.id] } }, data: { expiresAt: past } });
    await webhook(sepayTx(paid.vietQr.content, 70000));

    expect(await paymentsService.expireUnpaidOrders()).toBe(1);

    const statuses = await prisma.order.findMany({ where: { id: { in: [expired.id, paid.id, fresh.id] } }, orderBy: { id: 'asc' } });
    expect(statuses.map((o) => [o.status, o.paymentStatus])).toEqual([
      ['CANCELLED', 'VOIDED'],
      ['PENDING', 'PAID'],
      ['PENDING', 'UNPAID'],
    ]);
    expect(statuses[0]!.cancelReason).toBe('Quá hạn thanh toán chuyển khoản');
  });

  it('tiền về sau khi đơn đã tự huỷ → ghi nhận đã nhận tiền và báo quầy hoàn tiền', async () => {
    const ctx = await setup();
    const { order } = (await placeOrder(ctx)).body.data;
    await prisma.payment.update({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await paymentsService.expireUnpaidOrders();

    expect((await webhook(sepayTx(order.vietQr.content, 70000))).body.data.matched).toBe(true);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after).toMatchObject({ status: 'CANCELLED', paymentStatus: 'PAID' });
    expect(await prisma.notification.count({ where: { orderId: order.id, title: { startsWith: 'Cần hoàn tiền' } } })).toBe(2);
  });
});
