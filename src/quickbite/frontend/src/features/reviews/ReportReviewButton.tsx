import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toApiError } from '@/lib/api-client';
import { ordersService } from '@/services/orders.service';

/** Nút báo cáo đánh giá không phù hợp; quản trị viên sẽ kiểm duyệt */
export function ReportReviewButton({ reviewId, author }: { reviewId: number; author: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const report = useMutation({
    mutationFn: () => ordersService.reportReview(reviewId, reason.trim()),
    onSuccess: (r) => {
      toast.success(r.message);
      setOpen(false);
    },
    onError: (e) => setError(toApiError(e).message),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason('');
          setError('');
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs font-medium text-navy-400 hover:text-red-600"
        aria-label={`Báo cáo đánh giá của ${author}`}
      >
        <Flag className="size-3.5" aria-hidden /> Báo cáo
      </button>
      <ConfirmDialog
        open={open}
        title="Báo cáo đánh giá"
        description="Cho chúng tôi biết vì sao đánh giá này không phù hợp (vd: ngôn từ xúc phạm, spam, sai sự thật)."
        confirmLabel="Gửi báo cáo"
        tone="danger"
        loading={report.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (reason.trim().length < 5) return setError('Vui lòng mô tả lý do (ít nhất 5 ký tự)');
          report.mutate();
        }}
      >
        <label htmlFor={`report-${reviewId}`} className="mb-1.5 block text-sm font-medium">
          Lý do <span className="text-brand-600">*</span>
        </label>
        <input
          id={`report-${reviewId}`}
          value={reason}
          maxLength={255}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `report-${reviewId}-error` : undefined}
          className="h-11 w-full rounded-xl border border-gray-300 px-3.5 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
        />
        {error && (
          <p id={`report-${reviewId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
