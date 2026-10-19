import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import { VendorStallContext } from './vendor-stall-context';

const STORAGE_KEY = 'qb.vendor.stallId';

function readStored(): number | undefined {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Quầy đang được quản lý. Người quản lý nhiều quầy có thể chuyển qua lại; lựa chọn được nhớ trên trình duyệt. */
export function VendorStallProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: vendorKeys.stalls, queryFn: vendorService.myStalls });
  const [params] = useSearchParams();
  // Ưu tiên ?quay=<id> trên URL (vd: mở từ thông báo đơn của quầy khác), sau đó tới lựa chọn đã lưu
  const [selected, setSelected] = useState<number | undefined>(() => Number(params.get('quay')) || readStored());

  const stalls = data ?? [];
  const stall = stalls.find((s) => s.id === selected) ?? stalls[0];

  const setStallId = (id: number) => {
    setSelected(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Trình duyệt chặn lưu trữ: chỉ nhớ trong phiên hiện tại
    }
  };

  return (
    <VendorStallContext.Provider value={{ stalls, stall, stallId: stall?.id, setStallId, isPending, error, refetch: () => void refetch() }}>
      {children}
    </VendorStallContext.Provider>
  );
}

