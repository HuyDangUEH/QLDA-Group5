import { randomInt } from 'node:crypto';

// Bỏ các ký tự dễ nhầm lẫn (0/O, 1/I/L)
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Tạo mã đơn hàng dễ đọc, vd: QB-261016-4F7K (QB-YYMMDD-XXXX).
 * Cột orderNumber có ràng buộc UNIQUE; nơi gọi phải thử lại nếu trùng.
 */
export function generateOrderNumber(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `QB-${yy}${mm}${dd}-${suffix}`;
}
