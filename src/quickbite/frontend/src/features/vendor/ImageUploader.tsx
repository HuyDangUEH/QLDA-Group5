import { useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { toApiError } from '@/lib/api-client';
import { vendorService } from '@/services/vendor.service';
import { cn } from '@/lib/utils';

const MAX_MB = 2;
const ACCEPT = 'image/jpeg,image/png,image/webp';

interface ImageUploaderProps {
  stallId: number;
  value: string | null;
  onChange: (url: string | null) => void;
  type?: 'menu' | 'stall';
  label?: string;
  aspect?: string;
}

/** Chọn ảnh từ máy (JPG/PNG/WEBP, ≤ 2MB) và tải lên server; server kiểm tra lại định dạng thật của file */
export function ImageUploader({ stallId, value, onChange, type = 'menu', label = 'Ảnh', aspect = 'aspect-[4/3]' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return toast.error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP');
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Ảnh quá lớn, tối đa ${MAX_MB}MB`);
    setUploading(true);
    try {
      onChange(await vendorService.uploadImage(stallId, file, type));
      toast.success('Đã tải ảnh lên');
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium text-navy-800">
        {label}
      </p>
      <div className={cn('relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50', aspect)}>
        {value ? (
          <ImageWithFallback src={value} alt="Ảnh xem trước" className="size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 text-navy-400 hover:text-brand-600"
            aria-describedby={`${id}-hint`}
          >
            <ImagePlus className="size-8" aria-hidden />
            <span className="text-sm font-medium">Chọn ảnh từ máy</span>
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80" role="status">
            <Loader2 className="size-6 animate-spin text-brand-500" aria-hidden />
            <span className="sr-only">Đang tải ảnh lên</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p id={`${id}-hint`} className="text-xs text-navy-400">
          JPG, PNG, WEBP · tối đa {MAX_MB}MB
        </p>
        {value && (
          <div className="flex gap-3 text-sm whitespace-nowrap">
            <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-brand-600 hover:underline">
              Đổi ảnh
            </button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 font-medium text-navy-500 hover:text-red-600">
              <Trash2 className="size-3.5" aria-hidden /> Bỏ ảnh
            </button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-labelledby={`${id}-label`}
        tabIndex={-1}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
