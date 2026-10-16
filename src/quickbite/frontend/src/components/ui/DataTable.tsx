import type { Key, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => Key;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  minWidth?: number;
}

/**
 * Bảng dữ liệu dùng chung cho trang quản trị: cuộn ngang trên màn hình nhỏ,
 * có trạng thái đang tải và trống, caption cho trình đọc màn hình.
 */
export function DataTable<T>({ caption, columns, rows, rowKey, loading, empty, onRowClick, minWidth = 720 }: DataTableProps<T>) {
  const alignClass = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="relative overflow-x-auto rounded-(--radius-card) border border-gray-100 bg-white shadow-(--shadow-card)">
      <table className="w-full text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-gray-200 bg-gray-50/80 text-xs tracking-wide text-navy-500 uppercase">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold whitespace-nowrap', alignClass(c.align), c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading || !rows ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-full max-w-32" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-navy-500">
                {empty ?? 'Không có dữ liệu'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('align-middle', onRowClick && 'cursor-pointer hover:bg-gray-50')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', alignClass(c.align), c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
