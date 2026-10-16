import { z } from 'zod';

// Quy tắc giống hệt backend để báo lỗi ngay trên form (server vẫn kiểm tra lại)
const email = z.string().trim().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ'));

const password = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất 1 chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số');

const fullName = z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(120, 'Họ tên tối đa 120 ký tự');

const phone = z
  .string()
  .trim()
  .refine((v) => v === '' || /^(0|\+84)\d{9,10}$/.test(v), 'Số điện thoại không hợp lệ (vd: 0901234567)');

const studentCode = z
  .string()
  .trim()
  .refine((v) => v === '' || (v.length >= 3 && v.length <= 30), 'Mã sinh viên từ 3 đến 30 ký tự');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const registerSchema = z
  .object({ fullName, email, password, confirmPassword: z.string(), phone, studentCode })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' });

export const profileSchema = z.object({ fullName, phone, studentCode });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
