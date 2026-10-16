import bcrypt from 'bcrypt';
import { isTest } from '../config/env.js';

// 12 vòng (~250ms/lần) đủ an toàn; khi chạy test giảm còn 4 để test nhanh hơn
const SALT_ROUNDS = isTest ? 4 : 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// Hash giả dùng khi email không tồn tại, để thời gian phản hồi giống như khi sai mật khẩu
// (tránh kẻ xấu dò email nào đã đăng ký dựa vào tốc độ phản hồi)
const DUMMY_HASH = bcrypt.hashSync('quickbite-dummy-password', SALT_ROUNDS);

export async function burnPasswordCheck(plain: string) {
  await bcrypt.compare(plain, DUMMY_HASH);
}
