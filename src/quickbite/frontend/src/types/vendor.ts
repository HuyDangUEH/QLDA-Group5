import type { Money, Order, OrderStatus, PaymentMethod, PaymentStatus, Rating } from './models';

export interface VendorStall {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  location: string;
  phone: string | null;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  isAcceptingOrders: boolean;
  isOpenNow: boolean;
  canOrderNow: boolean;
  bankBin: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  acceptsVietQr: boolean;
  paymentTimeoutMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type StallRole = 'ADMIN' | 'OWNER' | 'STAFF';

export interface VendorStallDetail {
  stall: VendorStall & {
    memberships: { id: number; role: 'OWNER' | 'STAFF'; user: { id: number; fullName: string; email: string } }[];
    _count: { menuItems: number; orders: number };
  };
  myRole: StallRole;
}

export interface TopItem {
  menuItemId: number;
  name: string;
  quantity: number;
  revenue: Money;
}

export interface VendorDashboard {
  date: string;
  stall: { isAcceptingOrders: boolean; openTime: string; closeTime: string };
  today: { orders: number; completed: number; cancelled: number; revenue: Money };
  queue: { pending: number; inProgress: number; ready: number };
  rating: Rating;
  topItems7Days: TopItem[];
}

export type VendorOrderTab = 'new' | 'in_progress' | 'ready' | 'completed' | 'cancelled';

export interface VendorOrderRow {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** Đơn chuyển khoản chưa nhận được tiền */
  awaitingPayment: boolean;
  /** Hạn chuyển khoản; quá hạn chưa có tiền thì đơn tự huỷ */
  paymentExpiresAt: string | null;
  total: Money;
  pickupTime: string | null;
  customerNote: string | null;
  createdAt: string;
  student: { fullName: string; phone: string | null };
  pickupLocation: { id: number; name: string };
  items: { itemName: string; quantity: number; note: string | null }[];
  itemCount: number;
  nextStatuses: OrderStatus[];
}

export interface VendorOrder extends Order {
  nextStatuses: OrderStatus[];
}

export interface VendorMenuItem {
  id: number;
  stallId: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: Money;
  portion: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  soldCount: number;
  category: { id: number; name: string; slug: string };
}

export interface MenuItemInput {
  name: string;
  description: string | null;
  price: number;
  portion: string | null;
  categoryId: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
}

export interface SalesReport {
  range: { from: string; to: string };
  totals: { orders: number; completed: number; cancelled: number; revenue: Money; averageOrderValue: Money };
  statusCounts: Partial<Record<OrderStatus, number>>;
  series: { date: string; orders: number; completed: number; revenue: Money }[];
  topItems: TopItem[];
}

export interface AppNotification {
  id: number;
  type: 'ORDER_STATUS' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  orderId: number | null;
  order: { id: number; orderNumber: string; stallId: number } | null;
}
