import { useState, type ImgHTMLAttributes } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ảnh có khung dự phòng khi không có URL hoặc tải lỗi */
export function ImageWithFallback({ src, alt, className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt || 'Chưa có ảnh'}
        className={cn('flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-300', className)}
      >
        <UtensilsCrossed className="size-1/4 max-h-12 max-w-12" aria-hidden />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={className} {...props} />;
}
