/** Thời gian còn lại dạng mm:ss (hoặc h:mm:ss nếu ≥ 1 giờ) */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** Còn dưới 3 phút → tô màu cảnh báo */
export const isRunningOut = (ms: number) => ms > 0 && ms < 3 * 60_000;
