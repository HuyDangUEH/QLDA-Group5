import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authRateLimiter } from '../../middlewares/rate-limit.js';
import { authController } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, authController.register);
authRouter.post('/login', authRateLimiter, authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticate, authController.me);
