import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signSessionToken } from '../../lib/jwt.js';
import { AppError } from '../../utils/app-error.js';
import type { ChangePasswordInput, UpdateProfileInput } from '../auth/auth.schemas.js';
import { toPublicUser, userWithStallsInclude } from './users.mapper.js';

export const usersService = {
  async updateProfile(userId: number, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { fullName: input.fullName, phone: input.phone ?? null, studentCode: input.studentCode ?? null },
      include: userWithStallsInclude,
    });
    return toPublicUser(user);
  },

  /**
   * Đổi mật khẩu và tăng tokenVersion: mọi phiên đăng nhập khác (thiết bị khác) bị đăng xuất.
   * Trả về token mới để giữ đăng nhập trên thiết bị hiện tại.
   */
  async changePassword(userId: number, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.unauthorized();

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw AppError.badRequest('Mật khẩu hiện tại không đúng', [
        { field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng' },
      ]);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword), tokenVersion: { increment: 1 } },
    });
    return signSessionToken({ sub: updated.id, role: updated.role, tv: updated.tokenVersion });
  },
};
