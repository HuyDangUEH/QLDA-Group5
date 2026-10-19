import { prisma } from '../../lib/prisma.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { signSessionToken } from '../../lib/jwt.js';
import { AppError } from '../../utils/app-error.js';
import { toPublicUser, userWithStallsInclude } from '../users/users.mapper.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

const INVALID_CREDENTIALS = 'Email hoặc mật khẩu không đúng';

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) {
      throw AppError.conflict('Email này đã được đăng ký', [{ field: 'email', message: 'Email này đã được đăng ký' }]);
    }

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        phone: input.phone ?? null,
        studentCode: input.studentCode ?? null,
        role: 'STUDENT',
        lastLoginAt: new Date(),
      },
      include: userWithStallsInclude,
    });

    const token = signSessionToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    return { user: toPublicUser(user), token };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: userWithStallsInclude });

    if (!user) {
      await burnPasswordCheck(input.password);
      throw AppError.unauthorized(INVALID_CREDENTIALS);
    }
    if (!(await verifyPassword(input.password, user.passwordHash))) {
      throw AppError.unauthorized(INVALID_CREDENTIALS);
    }
    // Chỉ báo trạng thái tài khoản SAU khi mật khẩu đúng, để không lộ thông tin cho người lạ
    if (user.status === 'SUSPENDED') {
      throw AppError.forbidden('Tài khoản của bạn đã bị tạm khoá. Vui lòng liên hệ quản trị viên.');
    }
    if (user.status === 'INACTIVE') {
      throw AppError.forbidden('Tài khoản của bạn chưa được kích hoạt hoặc đã ngừng hoạt động.');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signSessionToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    return { user: toPublicUser(user), token };
  },

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: userWithStallsInclude });
    if (!user) throw AppError.unauthorized();
    return toPublicUser(user);
  },
};
