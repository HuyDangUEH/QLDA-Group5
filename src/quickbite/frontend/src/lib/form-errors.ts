import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { toApiError } from './api-client';

/**
 * Hiển thị lỗi từ server lên form:
 * - Lỗi gắn với trường cụ thể (details: [{ field, message }]) → hiện ngay dưới ô nhập
 * - Lỗi chung → hiện toast
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]) {
  const apiError = toApiError(error);
  const details = Array.isArray(apiError.details) ? (apiError.details as { field?: string; message?: string }[]) : [];

  let handled = false;
  for (const d of details) {
    if (d.field && d.message && (fields as readonly string[]).includes(d.field)) {
      setError(d.field as Path<T>, { type: 'server', message: d.message }, { shouldFocus: !handled });
      handled = true;
    }
  }
  if (!handled) toast.error(apiError.message);
}

/** Lấy đường dẫn chuyển hướng an toàn (chỉ đường dẫn nội bộ, chống open redirect) */
export function safeRedirect(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
