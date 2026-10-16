import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Flag, MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PageHeader } from '@/features/admin/PageHeader';
import { toApiError } from '@/lib/api-client';
import { adminKeys, adminService } from '@/services/admin.service';
import type { ReviewStatus } from '@/types/admin';
import { cn, formatDateTime } from '@/lib/utils';

const TABS: { value: ReviewStatus | ''; label: string }[] = [
  { value: 'REPORTED', label: 'Bị báo cáo' },
  { value: 'VISIBLE', label: 'Đang hiển thị' },
  { value: 'HIDDEN', label: 'Đã ẩn' },
  { value: '', label: 'Tất cả' },
];

const STATUS_BADGE: Record<ReviewStatus, { label: string; className: string }> = {
  REPORTED: { label: 'Bị báo cáo', className: 'bg-red-50 text-red-700' },
  VISIBLE: { label: 'Đang hiển thị', className: 'bg-green-50 text-green-700' },
  HIDDEN: { label: 'Đã ẩn', className: 'bg-gray-100 text-gray-600' },
};

export function AdminReviewsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus | ''>('REPORTED');
  const [page, setPage] = useState(1);
  const params = { status: status || undefined, page, pageSize: 10 };
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: adminKeys.reviews(params),
    queryFn: () => adminService.reviews(params),
    placeholderData: keepPreviousData,
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'VISIBLE' | 'HIDDEN' }) => adminService.moderateReview(id, status),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(v.status === 'HIDDEN' ? 'Đã ẩn đánh giá' : 'Đánh giá đã được hiển thị lại');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div>
      <PageHeader title="Kiểm duyệt đánh giá" description="Đánh giá bị ẩn không hiện trên trang quầy và không tính vào điểm trung bình." />

      <div role="tablist" aria-label="Lọc đánh giá" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={status === t.value}
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold',
              status === t.value ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-gray-200 hover:ring-brand-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={cn('transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-(--radius-card)" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={<MessageSquare className="size-7" aria-hidden />} title={status === 'REPORTED' ? 'Không có đánh giá nào bị báo cáo 🎉' : 'Không có đánh giá'} />
        ) : (
          <>
            <ul className="space-y-3">
              {data.items.map((r) => (
                <li key={r.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex" aria-label={`${r.rating} trên 5 sao`}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} className={i < r.rating ? 'size-4 fill-amber-400 text-amber-400' : 'size-4 text-gray-300'} aria-hidden />
                            ))}
                          </span>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_BADGE[r.status].className)}>{STATUS_BADGE[r.status].label}</span>
                        </div>
                        <p className="mt-1 text-sm text-navy-500">
                          <span className="font-medium text-navy-800">{r.student.fullName}</span> ({r.student.email}) · {r.stall.name} · Đơn{' '}
                          <span className="font-mono">{r.order.orderNumber}</span> · {formatDateTime(r.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {r.status !== 'HIDDEN' && (
                          <Button size="sm" variant="danger" loading={moderate.isPending && moderate.variables?.id === r.id} onClick={() => moderate.mutate({ id: r.id, status: 'HIDDEN' })}>
                            <EyeOff className="size-4" aria-hidden /> Ẩn
                          </Button>
                        )}
                        {r.status !== 'VISIBLE' && (
                          <Button size="sm" variant="outline" loading={moderate.isPending && moderate.variables?.id === r.id} onClick={() => moderate.mutate({ id: r.id, status: 'VISIBLE' })}>
                            <Eye className="size-4" aria-hidden /> {r.status === 'REPORTED' ? 'Giữ lại' : 'Hiện lại'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-navy-800">{r.comment ?? <span className="text-navy-400 italic">(Không có nhận xét)</span>}</p>
                    {r.reportReason && (
                      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-sm text-red-800">
                        <Flag className="mt-0.5 size-4 shrink-0" aria-hidden /> Lý do báo cáo: {r.reportReason}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
            {data.meta.totalPages > 1 && (
              <div className="mt-6">
                <Pagination meta={data.meta} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
