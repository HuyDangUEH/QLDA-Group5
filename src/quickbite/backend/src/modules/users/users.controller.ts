import type { Request, Response } from 'express';
import { currentUser } from '../../middlewares/auth.js';
import { sendSuccess } from '../../utils/response.js';
import { setSessionCookie } from '../../utils/session-cookie.js';
import { changePasswordSchema, updateProfileSchema } from '../auth/auth.schemas.js';
import { usersService } from './users.service.js';

export const usersController = {
  async updateMe(req: Request, res: Response) {
    const input = updateProfileSchema.parse(req.body);
    const user = await usersService.updateProfile(currentUser(req).id, input);
    sendSuccess(res, { user });
  },

  async changePassword(req: Request, res: Response) {
    const input = changePasswordSchema.parse(req.body);
    const token = await usersService.changePassword(currentUser(req).id, input);
    setSessionCookie(res, token);
    sendSuccess(res, { message: 'Đổi mật khẩu thành công. Các thiết bị khác đã bị đăng xuất.' });
  },
};
