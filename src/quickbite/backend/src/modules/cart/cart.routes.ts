import { Router } from 'express';
import { authenticate, currentUser, requireRole } from '../../middlewares/auth.js';
import { sendSuccess } from '../../utils/response.js';
import { idParamSchema } from '../../utils/validation.js';
import { addCartItemSchema, updateCartItemSchema } from './cart.schemas.js';
import { cartService } from './cart.service.js';

/** Giỏ hàng lưu trong DB, chỉ dành cho sinh viên */
export const cartRouter = Router();

cartRouter.use(authenticate, requireRole('STUDENT'));

cartRouter.get('/', async (req, res) => {
  sendSuccess(res, await cartService.view(currentUser(req).id));
});

cartRouter.post('/items', async (req, res) => {
  const input = addCartItemSchema.parse(req.body);
  sendSuccess(res, await cartService.addItem(currentUser(req).id, input), 201);
});

cartRouter.patch('/items/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateCartItemSchema.parse(req.body);
  sendSuccess(res, await cartService.updateItem(currentUser(req).id, id, input));
});

cartRouter.delete('/items/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  sendSuccess(res, await cartService.removeItem(currentUser(req).id, id));
});

cartRouter.delete('/', async (req, res) => {
  sendSuccess(res, await cartService.clear(currentUser(req).id));
});
