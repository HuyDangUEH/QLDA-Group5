/** Kiểu dữ liệu dùng chung, khớp với phản hồi từ backend. Tiền tệ là chuỗi decimal, vd "35000". */
export type Money = string;

export interface FoodStall {
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
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  itemCount: number;
}

export interface Rating {
  average: number | null;
  count: number;
}

export interface StallSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  location: string;
  phone: string | null;
  openTime: string;
  closeTime: string;
  isAcceptingOrders: boolean;
  /** Đang trong giờ mở cửa */
  isOpenNow: boolean;
  /** Đang nhận đơn: hoạt động + chủ quầy bật nhận đơn + trong giờ mở cửa */
  canOrderNow: boolean;
  /** Quầy nhận thanh toán chuyển khoản VietQR */
  acceptsVietQr: boolean;
  /** Số phút được phép chuyển khoản trước khi đơn tự huỷ */
  paymentTimeoutMinutes: number;
  rating: Rating;
  menuItemCount?: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: Money;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  soldCount: number;
  category: { id: number; name: string; slug: string };
  stall: { id: number; name: string; slug: string; isOpenNow: boolean; location?: string };
  /** Có thể thêm vào giỏ ngay */
  canOrder: boolean;
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
}

export interface StallDetail {
  stall: StallSummary;
  categories: { id: number; name: string; slug: string }[];
  menuItems: MenuItem[];
  reviews: Review[];
}

export interface MenuItemDetail {
  item: MenuItem;
  related: MenuItem[];
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge: string;
  link: string;
  imageUrl: string;
  tone: 'brand' | 'navy';
}

export interface HomeData {
  categories: Category[];
  featuredStalls: StallSummary[];
  popularItems: MenuItem[];
  featuredItems: MenuItem[];
  promotions: Promotion[];
}

// ─────────── Giỏ hàng & đơn hàng ───────────

export interface CartLine {
  id: number;
  quantity: number;
  note: string | null;
  menuItem: MenuItem;
  lineTotal: Money;
  /** Lý do món này không đặt được (hết món, ngừng bán) */
  issue: string | null;
}

export interface Cart {
  stall: StallSummary | null;
  items: CartLine[];
  itemCount: number;
  subtotal: Money;
  /** Lỗi ở cấp quầy: đóng cửa, tạm ngưng nhận đơn */
  stallIssue: string | null;
  canCheckout: boolean;
  /** Các khung giờ nhận món (ISO) */
  pickupSlots: string[];
}

export interface PickupLocation {
  id: number;
  name: string;
  building: string | null;
  description: string | null;
}

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'VOIDED';
export type PaymentMethod = 'CASH_ON_PICKUP' | 'VIETQR';

export interface OrderItem {
  id: number;
  menuItemId: number;
  itemName: string;
  unitPrice: Money;
  quantity: number;
  note: string | null;
  lineTotal: Money;
}

export interface OrderStatusChange {
  id: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: Money;
  serviceFee: Money;
  discount: Money;
  total: Money;
  customerNote: string | null;
  pickupTime: string | null;
  cancelReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  stall: { id: number; name: string; slug: string; location: string; phone: string | null; imageUrl: string | null };
  pickupLocation: PickupLocation;
  student: { id: number; fullName: string; phone: string | null; studentCode: string | null };
  items: OrderItem[];
  statusHistory: OrderStatusChange[];
  review: { id: number; rating: number; comment: string | null; createdAt: string } | null;
  /** Thông tin chuyển khoản; null với đơn tiền mặt */
  vietQr: VietQrInfo | null;
  /** Đơn chuyển khoản đang chờ tiền về (quầy chưa nhận đơn được) */
  awaitingPayment: boolean;
  canCancel: boolean;
}

export interface VietQrInfo {
  bankBin: string;
  bankShortName: string;
  bankName: string | null;
  accountNo: string;
  accountName: string | null;
  amount: Money;
  /** Nội dung chuyển khoản bắt buộc, vd: QB2610164F7K */
  content: string;
  expiresAt: string | null;
  paidAt: string | null;
  /** SEPAY = ngân hàng báo tự động, MANUAL = quầy xác nhận thủ công */
  confirmedBy: 'SEPAY' | 'MANUAL' | null;
  /** Chuỗi EMVCo để vẽ mã QR; chỉ có khi còn chờ thanh toán */
  qrPayload: string | null;
}

export interface Bank {
  bin: string;
  code: string;
  shortName: string;
  name: string;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: Money;
  pickupTime: string | null;
  createdAt: string;
  stall: { id: number; name: string; slug: string; imageUrl: string | null };
  pickupLocation: { id: number; name: string };
  items: { itemName: string; quantity: number }[];
  itemCount: number;
}
