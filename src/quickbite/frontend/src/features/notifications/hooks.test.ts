import { describe, expect, it } from 'vitest';
import type { AppNotification } from '@/types/vendor';
import { notificationLink } from './hooks';

const base: AppNotification = {
  id: 1,
  type: 'ORDER_STATUS',
  title: 't',
  message: 'm',
  isRead: false,
  createdAt: '2026-10-16T00:00:00Z',
  orderId: 42,
  order: { id: 42, orderNumber: 'QB-1', stallId: 3 },
};

describe('notificationLink', () => {
  it('sinh viên → trang đơn hàng của mình', () => {
    expect(notificationLink(base, 'STUDENT')).toBe('/don-hang/42');
  });

  it('chủ quầy / admin → mở đơn trong khu quản lý, đúng quầy', () => {
    expect(notificationLink(base, 'VENDOR')).toBe('/quan-ly/don-hang?order=42&quay=3');
    expect(notificationLink(base, 'ADMIN')).toBe('/quan-ly/don-hang?order=42&quay=3');
  });

  it('thông báo không gắn đơn → không có liên kết', () => {
    expect(notificationLink({ ...base, order: null, orderId: null }, 'STUDENT')).toBeNull();
  });
});
