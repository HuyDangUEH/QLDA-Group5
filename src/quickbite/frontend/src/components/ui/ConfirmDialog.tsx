import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/** Hộp thoại xác nhận thay cho window.confirm() */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} hideTitle className="max-w-md">
      <div className="p-6">
        <div className="flex gap-4">
          <span
            className={
              tone === 'danger'
                ? 'flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600'
                : 'flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600'
            }
          >
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="pr-6">
            <p className="text-lg font-bold" aria-hidden>
              {title}
            </p>
            {description && <div className="mt-1.5 text-sm text-navy-600">{description}</div>}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
