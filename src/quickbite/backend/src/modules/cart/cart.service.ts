import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/app-error.js';
import { getStallRatings, menuItemInclude, toMenuItem, toStallSummary } from '../catalog/catalog.mappers.js';
import { generatePickupSlots } from '../orders/pickup-slots.js';
import { MAX_CART_LINES, MAX_QUANTITY_PER_ITEM, type AddCartItemInput, type UpdateCartItemInput } from './cart.schemas.js';

const cartItemInclude = {
  menuItem: {
    include: {
      ...menuItemInclude,
      category: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemRow = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

/**
 * Lý do một dòng trong giỏ không thể đặt (null = đặt được).
 * Lỗi ở cấp quầy (đóng cửa, tạm ngưng nhận đơn) được báo chung qua `stallIssue`.
 */
function cartItemIssue(row: CartItemRow): string | null {
  const m = row.menuItem;
  if (!m.isActive || !m.category.isActive || !m.stall.isActive) return 'Món này đã ngừng bán';
  if (!m.isAvailable) return 'Món này đã hết, vui lòng xoá khỏi giỏ';
  return null;
}

export const cartService = {
  /** Giỏ hàng đầy đủ để hiển thị: món, tạm tính, cảnh báo, khung giờ nhận */
  async view(userId: number) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: cartItemInclude, orderBy: { createdAt: 'asc' } } },
    });
    const rows = cart?.items ?? [];

    const stallId = rows[0]?.menuItem.stallId;
    const stallRecord = stallId ? await prisma.foodStall.findUnique({ where: { id: stallId } }) : null;
    const stall = stallRecord ? toStallSummary(stallRecord, (await getStallRatings([stallRecord.id])).get(stallRecord.id)) : null;

    const items = rows.map((row) => {
      const menuItem = toMenuItem(row.menuItem);
      const lineTotal = row.menuItem.price.mul(row.quantity);
      return {
        id: row.id,
        quantity: row.quantity,
        note: row.note,
        menuItem,
        lineTotal: lineTotal.toFixed(0),
        issue: cartItemIssue(row),
      };
    });

    const subtotal = rows.reduce((sum, r) => sum.add(r.menuItem.price.mul(r.quantity)), new Prisma.Decimal(0));
    const stallIssue = !stall
      ? null
      : !stall.isOpenNow
        ? `Quầy hiện đã đóng cửa (mở cửa ${stall.openTime} – ${stall.closeTime})`
        : !stall.canOrderNow
          ? 'Quầy đang tạm ngưng nhận đơn'
          : null;

    return {
      stall,
      items,
      itemCount: rows.reduce((n, r) => n + r.quantity, 0),
      subtotal: subtotal.toFixed(0),
      stallIssue,
      canCheckout: items.length > 0 && !stallIssue && items.every((i) => !i.issue),
      pickupSlots: stallRecord ? generatePickupSlots(stallRecord) : [],
    };
  },

  async addItem(userId: number, input: AddCartItemInput) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: input.menuItemId }, include: menuItemInclude });
    if (!menuItem || !menuItem.isActive || !menuItem.stall.isActive) throw AppError.notFound('Không tìm thấy món ăn');

    const mapped = toMenuItem(menuItem);
    if (!menuItem.isAvailable) throw AppError.unprocessable('Món này đã hết, không thể thêm vào giỏ');
    if (!mapped.canOrder) throw AppError.unprocessable('Quầy hiện không nhận đơn, không thể thêm món vào giỏ');

    const cart = await prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });

    // Quy tắc một quầy / một đơn
    const otherStallItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, menuItem: { stallId: { not: menuItem.stallId } } },
      select: { menuItem: { select: { stall: { select: { id: true, name: true } } } } },
    });
    if (otherStallItem) {
      if (!input.replaceCart) {
        throw new AppError(
          409,
          'CART_STALL_CONFLICT',
          `Giỏ hàng đang có món của quầy "${otherStallItem.menuItem.stall.name}". Mỗi đơn chỉ đặt được món của một quầy.`,
          { currentStall: otherStallItem.menuItem.stall, newStall: { id: menuItem.stall.id, name: menuItem.stall.name } },
        );
      }
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    const existing = await prisma.cartItem.findUnique({ where: { cartId_menuItemId: { cartId: cart.id, menuItemId: menuItem.id } } });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: Math.min(existing.quantity + input.quantity, MAX_QUANTITY_PER_ITEM),
          ...(input.note !== undefined && input.note !== null && { note: input.note }),
        },
      });
    } else {
      const lines = await prisma.cartItem.count({ where: { cartId: cart.id } });
      if (lines >= MAX_CART_LINES) throw AppError.unprocessable(`Giỏ hàng tối đa ${MAX_CART_LINES} món khác nhau`);
      await prisma.cartItem.create({
        data: { cartId: cart.id, menuItemId: menuItem.id, quantity: input.quantity, note: input.note ?? null },
      });
    }
    return this.view(userId);
  },

  /** Chỉ sửa được dòng thuộc giỏ của chính mình */
  async updateItem(userId: number, cartItemId: number, input: UpdateCartItemInput) {
    const row = await prisma.cartItem.findFirst({ where: { id: cartItemId, cart: { userId } } });
    if (!row) throw AppError.notFound('Không tìm thấy món trong giỏ');
    await prisma.cartItem.update({
      where: { id: row.id },
      data: { ...(input.quantity !== undefined && { quantity: input.quantity }), ...(input.note !== undefined && { note: input.note }) },
    });
    return this.view(userId);
  },

  async removeItem(userId: number, cartItemId: number) {
    const { count } = await prisma.cartItem.deleteMany({ where: { id: cartItemId, cart: { userId } } });
    if (count === 0) throw AppError.notFound('Không tìm thấy món trong giỏ');
    return this.view(userId);
  },

  async clear(userId: number) {
    await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    return this.view(userId);
  },
};
