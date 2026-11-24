import { useState, type ImgHTMLAttributes } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Ảnh nằm ở đầu trang (thấy ngay khi mở): tải ngay, ưu tiên cao thay vì chờ cuộn tới */
  priority?: boolean;
}

/**
 * Ảnh có khung dự phòng khi không có URL hoặc tải lỗi.
 * Trong lúc ảnh đang tải (mạng yếu), hiện khung nhấp nháy thay vì ô trống (UAT-SV01).
 */
export function ImageWithFallback({ src, alt, className, priority = false, onLoad, ...props }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    // Đổi ảnh (vd danh sách đổi trang) → hiện lại khung chờ cho ảnh mới
    setLastSrc(src);
    setLoaded(false);
    setFailed(false);
  }

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
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      data-loaded={loaded || undefined}
      // Ảnh đã có trong bộ nhớ đệm có thể tải xong trước khi React gắn onLoad → kiểm tra ngay khi gắn
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={() => setFailed(true)}
      // Chưa tải xong: nền xám nhấp nháy (ẩn chữ alt để không lộ chữ trên khung chờ)
      className={cn(className, !loaded && 'animate-pulse bg-gray-200 text-transparent')}
      {...props}
    />
  );
}
