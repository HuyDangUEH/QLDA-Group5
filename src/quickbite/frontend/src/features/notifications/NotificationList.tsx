import type { AppNotification } from '@/types/vendor';
import { cn, formatDateTime } from '@/lib/utils';

/** Danh sách thông báo (dùng chung cho trang thông báo chung và trang thông báo của quầy) */
export function NotificationList({ items, onOpen }: { items: AppNotification[]; onOpen: (n: AppNotification) => void }) {
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-(--radius-card) border border-gray-100 bg-white shadow-(--shadow-card)">
      {items.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => onOpen(n)}
            className={cn('flex w-full gap-3 p-4 text-left transition hover:bg-gray-50', !n.isRead && 'bg-brand-50/50')}
          >
            <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand-500')} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className={cn('block', !n.isRead && 'font-bold')}>
                {n.title}
                {!n.isRead && <span className="sr-only"> (chưa đọc)</span>}
              </span>
              <span className="mt-0.5 block text-sm text-navy-600">{n.message}</span>
              <span className="mt-1 block text-xs text-navy-400">{formatDateTime(n.createdAt)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
