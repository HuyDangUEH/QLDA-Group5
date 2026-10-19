import type { Cart, MenuItem, Order, StallSummary } from '@/types/models';

export function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 1,
    name: 'Phở bò tái',
    description: 'Nước dùng thanh ngọt',
    price: '45000',
    imageUrl: null,
    isAvailable: true,
    isFeatured: false,
    soldCount: 12,
    category: { id: 1, name: 'Bún – Phở – Mì', slug: 'bun-pho-mi' },
    stall: { id: 1, name: 'Phở & Mì Cô Ba', slug: 'pho-mi-co-ba', isOpenNow: true },
    canOrder: true,
    ...overrides,
  };
}

export function makeStall(overrides: Partial<StallSummary> = {}): StallSummary {
  return {
    id: 1,
    name: 'Phở & Mì Cô Ba',
    slug: 'pho-mi-co-ba',
    description: null,
    imageUrl: null,
    location: 'Tòa A',
    phone: null,
    openTime: '06:00',
    closeTime: '20:00',
    isAcceptingOrders: true,
    isOpenNow: true,
    canOrderNow: true,
    rating: { average: null, count: 0 },
    ...overrides,
  };
}

export function makeCart(overrides: Partial<Cart> = {}): Cart {
  return {
    stall: makeStall(),
    items: [{ id: 10, quantity: 2, note: 'Ít hành', menuItem: makeMenuItem(), lineTotal: '90000', issue: null }],
    itemCount: 2,
    subtotal: '90000',
    stallIssue: null,
    canCheckout: true,
    pickupSlots: ['2026-10-16T03:30:00.000Z', '2026-10-16T03:45:00.000Z'],
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    orderNumber: 'QB-261016-ABCD',
    status: 'PENDING',
    paymentMethod: 'CASH_ON_PICKUP',
    paymentStatus: 'UNPAID',
    subtotal: '90000',
    serviceFee: '0',
    discount: '0',
    total: '90000',
    customerNote: null,
    pickupTime: null,
    cancelReason: null,
    createdAt: '2026-10-16T03:00:00.000Z',
    acceptedAt: null,
    readyAt: null,
    completedAt: null,
    cancelledAt: null,
    stall: { id: 1, name: 'Phở & Mì Cô Ba', slug: 'pho-mi-co-ba', location: 'Tòa A', phone: null, imageUrl: null },
    pickupLocation: { id: 1, name: 'Sảnh tòa A1', building: null, description: null },
    student: { id: 1, fullName: 'Nguyễn Văn An', phone: null, studentCode: null },
    items: [{ id: 1, menuItemId: 1, itemName: 'Phở bò tái', unitPrice: '45000', quantity: 2, note: null, lineTotal: '90000' }],
    statusHistory: [{ id: 1, fromStatus: null, toStatus: 'PENDING', note: null, createdAt: '2026-10-16T03:00:00.000Z' }],
    review: null,
    canCancel: true,
    ...overrides,
  };
}
