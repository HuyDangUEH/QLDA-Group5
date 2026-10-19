import { useEffect, useState } from 'react';

/** Thời điểm hiện tại, tự cập nhật mỗi `intervalMs` (dùng cho bộ đếm "chờ X phút") */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
