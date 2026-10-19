import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authRateLimiter } from '../../middlewares/rate-limit.js';
import { usersController } from './users.controller.js';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.patch('/me', usersController.updateMe);
usersRouter.patch('/me/password', authRateLimiter, usersController.changePassword);
