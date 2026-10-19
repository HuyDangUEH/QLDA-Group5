import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService, type AddToCartPayload } from '@/services/cart.service';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Cart } from '@/types/models';

export const cartKeys = { cart: ['cart'] as const };

/** Giỏ hàng của sinh viên đang đăng nhập (không gọi API với khách / chủ quầy / admin) */
export function useCart() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: cartKeys.cart,
    queryFn: cartService.get,
    enabled: user?.role === 'STUDENT',
    // Giá, tình trạng món có thể thay đổi: luôn lấy lại khi mở trang giỏ
    staleTime: 0,
  });
}

/** Mọi API giỏ hàng trả về giỏ mới nhất → ghi thẳng vào cache, không cần gọi lại */
function useCartMutation<TVars>(fn: (vars: TVars) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.cart, cart),
  });
}

export const useAddToCart = () => useCartMutation((payload: AddToCartPayload) => cartService.add(payload));
export const useUpdateCartItem = () =>
  useCartMutation(({ id, ...payload }: { id: number; quantity?: number; note?: string | null }) => cartService.update(id, payload));
export const useRemoveCartItem = () => useCartMutation((id: number) => cartService.remove(id));
export const useClearCart = () => useCartMutation(() => cartService.clear());
