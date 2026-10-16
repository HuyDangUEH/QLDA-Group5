/**
 * Banner khuyến mãi trên trang chủ (dữ liệu cấu hình).
 * Chỉnh sửa trực tiếp file này để đổi nội dung; trang chủ lấy qua GET /api/v1/home.
 * `link` là đường dẫn nội bộ của giao diện.
 */
export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge: string;
  link: string;
  imageUrl: string;
  /** Tông màu banner: brand (cam) | navy (xanh đậm) */
  tone: 'brand' | 'navy';
}

export const PROMOTIONS: Promotion[] = [
  {
    id: 'mua-thi',
    title: 'Tiếp sức mùa thi',
    description: 'Trà sữa, cà phê và sinh tố giúp bạn tỉnh táo ôn bài cả ngày.',
    badge: 'Đồ uống',
    link: '/mon-an?category=do-uong',
    imageUrl: '/images/food/tra-sua-tran-chau-duong-den.webp',
    tone: 'navy',
  },
  {
    id: 'an-healthy',
    title: 'Ăn xanh, sống khoẻ',
    description: 'Salad tươi và món chay thanh đạm từ quầy Vườn Xanh.',
    badge: 'Healthy',
    link: '/quan-an/vuon-xanh-chay-salad',
    imageUrl: '/images/food/salad-rau-cu-hat-dinh-duong.webp',
    tone: 'brand',
  },
];
