import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState } from '@/components/ui/States';
import { inputClass } from '@/components/ui/styles';
import { PageHeader } from '@/features/admin/PageHeader';
import { ORDER_STATUS_LABELS } from '@/features/orders/order-labels';
import { ROLE_LABELS, STATUS_LABELS } from '@/features/auth/types';
import { adminKeys, adminService } from '@/services/admin.service';
import type { AuditLog } from '@/types/admin';
import { cn, formatDateTime } from '@/lib/utils';

/** Nhãn tiếng Việt cho từng hành động trong nhật ký */
const ACTION_LABELS: Record<string, string> = {
  USER_CREATE: 'Tạo tài khoản',
  USER_UPDATE: 'Sửa thông tin người dùng',
  USER_STATUS_CHANGE: 'Đổi trạng thái tài khoản',
  USER_ROLE_CHANGE: 'Đổi vai trò',
  USER_PASSWORD_RESET: 'Đặt lại mật khẩu',
  STALL_CREATE: 'Tạo quầy',
  STALL_UPDATE: 'Sửa quầy',
  STALL_MEMBER_ADD: 'Thêm nhân sự quầy',
  STALL_MEMBER_UPDATE: 'Đổi vai trò nhân sự',
  STALL_MEMBER_REMOVE: 'Gỡ nhân sự quầy',
  CATEGORY_CREATE: 'Tạo danh mục',
  CATEGORY_UPDATE: 'Sửa danh mục',
  CATEGORY_DELETE: 'Xoá danh mục',
  PICKUP_LOCATION_CREATE: 'Tạo điểm nhận',
  PICKUP_LOCATION_UPDATE: 'Sửa điểm nhận',
  ORDER_STATUS_CHANGE: 'Đổi trạng thái đơn',
  REVIEW_MODERATE: 'Kiểm duyệt đánh giá',
  SEED_DATABASE: 'Khởi tạo dữ liệu mẫu',
};

const ENTITY_LABELS: Record<string, string> = {
  User: 'Người dùng',
  FoodStall: 'Quầy',
  FoodCategory: 'Danh mục',
  CampusPickupLocation: 'Điểm nhận',
  Order: 'Đơn hàng',
  Review: 'Đánh giá',
  System: 'Hệ thống',
};

/** Nhãn tiếng Việt cho các giá trị trạng thái / vai trò xuất hiện trong nhật ký */
const VALUE_LABELS: Record<string, string> = {
  ...ROLE_LABELS,
  ...STATUS_LABELS,
  VISIBLE: 'Hiển thị',
  HIDDEN: 'Đã ẩn',
  REPORTED: 'Bị báo cáo',
};
const label = (value?: string) => (value ? (VALUE_LABELS[value] ?? value) : '?');

/** Diễn giải ngắn gọn metadata để người đọc không phải xem JSON */
function describe(log: AuditLog): string {
  const m = log.metadata ?? {};
  const v = (k: string) => (m[k] === undefined || m[k] === null ? undefined : String(m[k]));
  switch (log.action) {
    case 'USER_ROLE_CHANGE':
    case 'USER_STATUS_CHANGE':
    case 'REVIEW_MODERATE':
      return `${label(v('from'))} → ${label(v('to'))}${v('note') ? ` (${v('note')})` : ''}`;
    case 'USER_CREATE':
      return `${v('email')} (${label(v('role'))})`;
    case 'SEED_DATABASE':
      return `${v('orders')} đơn hàng mẫu`;
    case 'ORDER_STATUS_CHANGE':
      return `→ ${ORDER_STATUS_LABELS[v('to') as keyof typeof ORDER_STATUS_LABELS] ?? v('to')}${v('reason') ? ` · ${v('reason')}` : ''}`;
    case 'STALL_MEMBER_ADD':
      return `${v('email')} (${v('role') === 'OWNER' ? 'chủ quầy' : 'nhân viên'})`;
    case 'STALL_UPDATE':
    case 'CATEGORY_UPDATE':
    case 'PICKUP_LOCATION_UPDATE':
      return Array.isArray(m.changed) && m.changed.length ? `Thay đổi: ${(m.changed as string[]).join(', ')}` : '';
    default:
      return v('name') ?? v('email') ?? (Object.keys(m).length ? JSON.stringify(m) : '');
  }
}

export function AdminAuditLogsPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const params = { action: action || undefined, page, pageSize: 20 };
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: adminKeys.audit(params),
    queryFn: () => adminService.auditLogs(params),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'Thời gian', cell: (l) => <span className="whitespace-nowrap text-navy-600">{formatDateTime(l.createdAt)}</span> },
    {
      key: 'actor',
      header: 'Người thực hiện',
      cell: (l) =>
        l.actor ? (
          <>
            <p className="font-medium">{l.actor.fullName}</p>
            <p className="text-xs text-navy-500">{l.actor.email}</p>
          </>
        ) : (
          <span className="text-navy-400">(đã xoá)</span>
        ),
    },
    { key: 'action', header: 'Hành động', cell: (l) => <span className="font-medium">{ACTION_LABELS[l.action] ?? l.action}</span> },
    { key: 'entity', header: 'Đối tượng', cell: (l) => `${ENTITY_LABELS[l.entityType] ?? l.entityType}${l.entityId ? ` #${l.entityId}` : ''}` },
    { key: 'details', header: 'Chi tiết', cell: (l) => <span className="text-navy-600">{describe(l) || '—'}</span> },
    { key: 'ip', header: 'IP', cell: (l) => <span className="font-mono text-xs text-navy-400">{l.ipAddress ?? '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Nhật ký quản trị" description="Ghi lại các thao tác quan trọng của quản trị viên. Nhật ký không thể sửa hoặc xoá." />
      <div className="mb-4">
        <label htmlFor="audit-action" className="sr-only">
          Lọc theo hành động
        </label>
        <select
          id="audit-action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className={cn(inputClass(), 'sm:w-72')}
        >
          <option value="">Tất cả hành động</option>
          {Object.entries(ACTION_LABELS)
            .filter(([k]) => k !== 'SEED_DATABASE')
            .map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </select>
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <div className={cn('transition-opacity', isFetching && !isPending && 'opacity-60')}>
          <DataTable caption="Nhật ký quản trị" columns={columns} rows={data?.items} rowKey={(l) => l.id} loading={isPending} minWidth={900} empty="Chưa có nhật ký" />
          {data && data.meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination meta={data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
