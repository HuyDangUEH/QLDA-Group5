import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareHeart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toApiError } from '@/lib/api-client';
import { orderKeys, ordersService } from '@/services/orders.service';
import type { Order } from '@/types/models';
import { formatDate } from '@/lib/utils';
import { StarRatingInput } from './StarRatingInput';

/** Đánh giá đơn đã hoàn thành (mỗi đơn một lần). Đã đánh giá thì hiển thị lại nội dung. */
export function OrderReviewCard({ order }: { order: Order }) {
  if (order.status !== 'COMPLETED') return null;
  if (order.review) {
    return (
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <MessageSquareHeart className="size-5 text-brand-500" aria-hidden /> Đánh giá của bạn
        </h2>
        <p className="mt-2 flex" aria-label={`${order.review.rating} trên 5 sao`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={i < order.review!.rating ? 'size-5 fill-amber-400 text-amber-400' : 'size-5 text-gray-300'} aria-hidden />
          ))}
        </p>
        {order.review.comment && <p className="mt-2 text-navy-700">{order.review.comment}</p>}
        <p className="mt-2 text-xs text-navy-400">Đánh giá ngày {formatDate(order.review.createdAt)}</p>
      </Card>
    );
  }
  return <ReviewForm order={order} />;
}

function ReviewForm({ order }: { order: Order }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const submit = useMutation({
    mutationFn: () => ordersService.review(order.id, { rating, comment: comment.trim() || undefined }),
    onSuccess: (review) => {
      qc.setQueryData<Order>(orderKeys.detail(order.id), (o) => (o ? { ...o, review } : o));
      qc.invalidateQueries({ queryKey: ['catalog'] });
      toast.success('Cảm ơn bạn đã đánh giá! ❤️');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <MessageSquareHeart className="size-5 text-brand-500" aria-hidden /> Bữa ăn thế nào?
      </h2>
      <p className="mt-1 text-sm text-navy-500">Đánh giá của bạn giúp {order.stall.name} phục vụ tốt hơn và giúp các bạn khác chọn món.</p>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (rating === 0) return setError('Vui lòng chọn số sao');
          setError('');
          submit.mutate();
        }}
      >
        <StarRatingInput
          value={rating}
          onChange={(v) => {
            setRating(v);
            setError('');
          }}
          error={error}
        />
        <div>
          <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium text-navy-800">
            Nhận xét <span className="font-normal text-navy-400">(không bắt buộc)</span>
          </label>
          <textarea
            id="review-comment"
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Món ăn, phục vụ, thời gian chờ..."
            className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
        </div>
        <Button type="submit" loading={submit.isPending}>
          Gửi đánh giá
        </Button>
      </form>
    </Card>
  );
}
