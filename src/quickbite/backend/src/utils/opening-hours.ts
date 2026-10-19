/** Múi giờ của trường; giờ mở/đóng cửa của quầy được lưu theo giờ địa phương */
export const CAMPUS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Số phút tính từ 00:00 theo giờ trường tại thời điểm `date` */
export function campusMinutesOfDay(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Quầy có đang trong giờ mở cửa không.
 * Hỗ trợ cả khung giờ qua nửa đêm (vd 18:00–02:00).
 */
export function isWithinOpeningHours(openTime: string, closeTime: string, date = new Date()): boolean {
  const now = campusMinutesOfDay(date);
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  if (open === close) return true; // mở cả ngày
  return open < close ? now >= open && now < close : now >= open || now < close;
}

/** Định dạng "HH:mm" hợp lệ */
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
