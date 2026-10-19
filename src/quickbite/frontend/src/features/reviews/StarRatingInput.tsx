import { useId, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const LABELS = ['', 'Rất tệ', 'Chưa ngon', 'Bình thường', 'Ngon', 'Tuyệt vời'];

/** Chọn số sao bằng chuột hoặc phím mũi tên (nhóm radio cho trình đọc màn hình) */
export function StarRatingInput({ value, onChange, error }: { value: number; onChange: (v: number) => void; error?: string }) {
  const [hover, setHover] = useState(0);
  const name = useId();
  const shown = hover || value;

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-navy-800">
        Chấm điểm <span className="text-brand-600" aria-hidden>*</span>
      </legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" aria-label={`${n} sao – ${LABELS[n]}`} />
            <Star
              className={cn(
                'size-8 transition peer-focus-visible:rounded peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500',
                n <= shown ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
              )}
              aria-hidden
            />
          </label>
        ))}
        <span className="ml-2 text-sm font-medium text-navy-600" aria-hidden>
          {LABELS[shown]}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
