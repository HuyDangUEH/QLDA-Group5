import { createContext, useContext } from 'react';
import type { VendorStall } from '@/types/vendor';

export interface VendorStallContextValue {
  stalls: VendorStall[];
  stall: VendorStall | undefined;
  stallId: number | undefined;
  setStallId: (id: number) => void;
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
}

export const VendorStallContext = createContext<VendorStallContextValue | null>(null);

export function useVendorStall() {
  const ctx = useContext(VendorStallContext);
  if (!ctx) throw new Error('useVendorStall phải dùng bên trong VendorStallProvider');
  return ctx;
}

/** Dùng trong các trang con của layout chủ quầy (layout đảm bảo đã có quầy) */
export function useCurrentStallId(): number {
  const { stallId } = useVendorStall();
  if (stallId === undefined) throw new Error('Chưa chọn quầy');
  return stallId;
}
