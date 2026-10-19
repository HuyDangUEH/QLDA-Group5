import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Ẩn tiêu đề khỏi màn hình nhưng vẫn đọc được bởi trình đọc màn hình */
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Hộp thoại dùng phần tử <dialog> gốc của trình duyệt: tự giữ focus bên trong, đóng bằng phím Esc,
 * và làm mờ nội dung phía sau. Bấm ra vùng tối bên ngoài cũng đóng hộp thoại.
 */
export function Dialog({ open, onClose, title, hideTitle, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl bg-white p-0 text-navy-900 shadow-2xl backdrop:bg-navy-950/60 backdrop:backdrop-blur-sm',
        'max-h-[calc(100dvh-2rem)]',
        className,
      )}
    >
      {open && (
        <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <h2 id={titleId} className={cn(hideTitle ? 'sr-only' : 'px-6 pt-6 text-xl font-bold')}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 text-navy-700 shadow hover:bg-white"
          >
            <X className="size-5" aria-hidden />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
