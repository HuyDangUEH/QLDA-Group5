import type { FoodStall } from '@prisma/client';
import { isWithinOpeningHours } from '../../utils/opening-hours.js';

/** Thời gian chuẩn bị tối thiểu trước khi nhận món */
export const MIN_PREP_MINUTES = 15;
/** Cho phép hẹn giờ nhận tối đa bao lâu trước */
export const MAX_AHEAD_MINUTES = 4 * 60;
const SLOT_MINUTES = 15;
/** Sai lệch đồng hồ cho phép giữa lúc hiện khung giờ và lúc bấm đặt */
const TOLERANCE_MS = 5 * 60_000;

type StallHours = Pick<FoodStall, 'openTime' | 'closeTime'>;

/**
 * Các khung giờ nhận món có thể chọn (mỗi 15 phút), từ "bây giờ + 15 phút" tới tối đa 4 giờ sau,
 * và phải nằm trong giờ mở cửa của quầy.
 */
export function generatePickupSlots(stall: StallHours, now = new Date()): Date[] {
  const earliest = now.getTime() + MIN_PREP_MINUTES * 60_000;
  const slotMs = SLOT_MINUTES * 60_000;
  const first = Math.ceil(earliest / slotMs) * slotMs;
  const last = now.getTime() + MAX_AHEAD_MINUTES * 60_000;

  const slots: Date[] = [];
  for (let t = first; t <= last; t += slotMs) {
    const slot = new Date(t);
    if (isWithinOpeningHours(stall.openTime, stall.closeTime, slot)) slots.push(slot);
  }
  return slots;
}

/** Trả về thông báo lỗi nếu giờ nhận không hợp lệ, null nếu hợp lệ */
export function validatePickupTime(pickupTime: Date, stall: StallHours, now = new Date()): string | null {
  const t = pickupTime.getTime();
  if (Number.isNaN(t)) return 'Giờ nhận món không hợp lệ';
  if (t < now.getTime() + MIN_PREP_MINUTES * 60_000 - TOLERANCE_MS) {
    return `Giờ nhận món phải sau thời điểm hiện tại ít nhất ${MIN_PREP_MINUTES} phút`;
  }
  if (t > now.getTime() + MAX_AHEAD_MINUTES * 60_000 + TOLERANCE_MS) {
    return `Chỉ được hẹn giờ nhận món trong vòng ${MAX_AHEAD_MINUTES / 60} giờ tới`;
  }
  if (!isWithinOpeningHours(stall.openTime, stall.closeTime, pickupTime)) {
    return `Quầy không mở cửa vào giờ này (giờ mở cửa ${stall.openTime} – ${stall.closeTime})`;
  }
  return null;
}
