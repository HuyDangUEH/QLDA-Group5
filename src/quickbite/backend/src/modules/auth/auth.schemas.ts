import { z } from 'zod';

export const emailSchema = z
  .string({ error: 'Vui lòng nhập email' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Email không hợp lệ' }).max(191, 'Email quá dài'));

/** Mật khẩu: 8–72 ký tự (giới hạn của bcrypt), có ít nhất 1 chữ cái và 1 chữ số */
export const passwordSchema = z
  .string({ error: 'Vui lòng nhập mật khẩu' })
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất 1 chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số');

export const fullNameSchema = z
  .string({ error: 'Vui lòng nhập họ tên' })
  .trim()
  .min(2, 'Họ tên phải có ít nhất 2 ký tự')
  .max(120, 'Họ tên tối đa 120 ký tự');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ (vd: 0901234567)');

export const studentCodeSchema = z.string().trim().min(3, 'Mã sinh viên quá ngắn').max(30, 'Mã sinh viên quá dài');

/** Chuỗi rỗng từ form được coi như không nhập (null) */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema.nullish());

// Đăng ký công khai chỉ tạo tài khoản SINH VIÊN. Không nhận trường "role" từ client.
export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: optional(phoneSchema),
  studentCode: optional(studentCodeSchema),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Không áp quy tắc độ mạnh khi đăng nhập, chỉ cần có nhập
  password: z.string({ error: 'Vui lòng nhập mật khẩu' }).min(1, 'Vui lòng nhập mật khẩu').max(200),
});

/**
 * PATCH hồ sơ: chỉ sửa các trường được gửi lên.
 * Không gửi trường → giữ nguyên; gửi chuỗi rỗng / null → xoá (số điện thoại, mã sinh viên).
 */
export const updateProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  phone: optional(phoneSchema),
  studentCode: optional(studentCodeSchema),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
