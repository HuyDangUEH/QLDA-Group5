import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/types/api';
import { Button } from './Button';

export function Pagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <nav aria-label="Phân trang" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-navy-500">
        Hiển thị <span className="font-semibold text-navy-800">{from}–{to}</span> trên tổng{' '}
        <span className="font-semibold text-navy-800">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          <ChevronLeft className="size-4" aria-hidden /> Trước
        </Button>
        <span className="px-2 text-sm text-navy-600" aria-current="page">
          Trang {meta.page}/{meta.totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
          Sau <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
