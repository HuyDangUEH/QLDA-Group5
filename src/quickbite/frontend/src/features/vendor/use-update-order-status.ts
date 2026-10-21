import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toApiError } from '@/lib/api-client';
import { adminKeys, adminService } from '@/services/admin.service';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import type { OrderStatus } from '@/types/models';
import type { VendorOrder } from '@/types/vendor';
import { ORDER_STATUS_LABELS } from '@/features/orders/order-labels';

/** 'vendor' = API của quầy; 'admin' = API quản trị (có ghi nhật ký) */
export type OrderActionMode = 'vendor' | 'admin';

/** Chuyển trạng thái đơn; cập nhật cache chi tiết đơn, danh sách đơn và dashboard */
export function useUpdateOrderStatus(stallId: number, mode: OrderActionMode = 'vendor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status, reason }: { orderId: number; status: OrderStatus; reason?: string }) =>
      mode === 'admin' ? adminService.updateOrderStatus(orderId, status, reason) : vendorService.updateOrderStatus(stallId, orderId, status, reason),
    onSuccess: (order) => {
      if (mode === 'admin') {
        queryClient.setQueryData(adminKeys.order(order.id), order);
        queryClient.invalidateQueries({ queryKey: adminKeys.all });
      } else {
        queryClient.setQueryData(vendorKeys.order(stallId, order.id), order);
        queryClient.invalidateQueries({ queryKey: ['vendor', stallId, 'orders'] });
        queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(stallId) });
      }
      toast.success(`Đơn ${order.orderNumber}: ${ORDER_STATUS_LABELS[order.status]}`);
    },
    onError: (e) => {
      toast.error(toApiError(e).message);
      // Có thể người khác vừa xử lý đơn → tải lại
      queryClient.invalidateQueries({ queryKey: mode === 'admin' ? adminKeys.all : ['vendor', stallId] });
    },
  });
}

/** Quầy (hoặc admin) xác nhận đã nhận chuyển khoản cho đơn VietQR */
export function useConfirmPayment(stallId: number, mode: OrderActionMode = 'vendor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => vendorService.confirmPayment(stallId, orderId),
    onSuccess: (order: VendorOrder) => {
      if (mode === 'admin') {
        queryClient.setQueryData(adminKeys.order(order.id), order);
        queryClient.invalidateQueries({ queryKey: adminKeys.all });
      } else {
        queryClient.setQueryData(vendorKeys.order(stallId, order.id), order);
        queryClient.invalidateQueries({ queryKey: ['vendor', stallId, 'orders'] });
        queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(stallId) });
      }
      toast.success(`Đơn ${order.orderNumber}: đã xác nhận nhận tiền, bạn có thể nhận đơn.`);
    },
    onError: (e) => {
      toast.error(toApiError(e).message);
      queryClient.invalidateQueries({ queryKey: mode === 'admin' ? adminKeys.all : ['vendor', stallId] });
    },
  });
}
