import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiError, toApiError } from '@/lib/api-client';
import { useCurrentUser } from '@/features/auth/hooks';
import type { MenuItem } from '@/types/models';
import { useAddToCart } from './hooks';

interface PendingAdd {
  item: MenuItem;
  quantity: number;
  note: string;
  currentStall: string;
}

/**
 * Logic "Thêm vào giỏ" dùng chung:
 * - Khách → chuyển tới đăng nhập rồi quay lại trang hiện tại
 * - Chủ quầy / admin → không được đặt món
 * - Giỏ đang có món của quầy khác → hỏi xác nhận thay giỏ
 */
export function useAddToCartAction(onAdded?: () => void) {
  const { data: user } = useCurrentUser();
  const add = useAddToCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<PendingAdd | null>(null);

  const blockedReason = user && user.role !== 'STUDENT' ? 'Chỉ tài khoản sinh viên mới có thể đặt món.' : undefined;

  const submit = (item: MenuItem, quantity: number, note: string, replaceCart = false) => {
    add.mutate(
      { menuItemId: item.id, quantity, note: note || undefined, replaceCart },
      {
        onSuccess: () => {
          setPending(null);
          toast.success(`Đã thêm ${quantity} × ${item.name} vào giỏ`, {
            action: { label: 'Xem giỏ', onClick: () => navigate('/gio-hang') },
          });
          onAdded?.();
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError instanceof ApiError && apiError.code === 'CART_STALL_CONFLICT') {
            const details = apiError.details as { currentStall?: { name: string } } | undefined;
            setPending({ item, quantity, note, currentStall: details?.currentStall?.name ?? 'khác' });
            return;
          }
          setPending(null);
          toast.error(apiError.message);
        },
      },
    );
  };

  const handleAdd = (item: MenuItem, { quantity, note }: { quantity: number; note: string }) => {
    if (!user) {
      toast.info('Vui lòng đăng nhập để đặt món');
      navigate(`/dang-nhap?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    submit(item, quantity, note);
  };

  const confirmDialog = (
    <ConfirmDialog
      open={pending !== null}
      title="Bắt đầu giỏ hàng mới?"
      description={
        pending && (
          <>
            Giỏ hàng của bạn đang có món của quầy <strong>{pending.currentStall}</strong>. Mỗi đơn chỉ đặt được món của một quầy.
            Xoá giỏ hiện tại để thêm <strong>{pending.item.name}</strong>?
          </>
        )
      }
      confirmLabel="Xoá giỏ & thêm món"
      cancelLabel="Giữ giỏ hiện tại"
      tone="danger"
      loading={add.isPending}
      onConfirm={() => pending && submit(pending.item, pending.quantity, pending.note, true)}
      onCancel={() => setPending(null)}
    />
  );

  return { handleAdd, adding: add.isPending, blockedReason, confirmDialog };
}
