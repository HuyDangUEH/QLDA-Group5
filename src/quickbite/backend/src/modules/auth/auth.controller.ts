import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { clearSessionCookie, setSessionCookie } from '../../utils/session-cookie.js';
import { currentUser } from '../../middlewares/auth.js';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const { user, token } = await authService.register(input);
    setSessionCookie(res, token);
    sendSuccess(res, { user }, 201);
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const { user, token } = await authService.login(input);
    setSessionCookie(res, token);
    sendSuccess(res, { user });
  },

  logout(_req: Request, res: Response) {
    clearSessionCookie(res);
    sendSuccess(res, { message: 'Đã đăng xuất' });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(currentUser(req).id);
    sendSuccess(res, { user });
  },
};
