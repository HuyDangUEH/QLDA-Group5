import { Router } from 'express';
import { authenticate, currentUser, requireRole } from '../../middlewares/auth.js';
import { buildPaginationMeta, sendSuccess } from '../../utils/response.js';
import { idParamSchema } from '../../utils/validation.js';
import { cancelOrderSchema, createOrderSchema, listOrdersQuery } from './orders.schemas.js';
import { ordersService } from './orders.service.js';
import { createReviewForOrder, createReviewSchema } from '../reviews/reviews.routes.js';

/** Đơn hàng của sinh viên. Quầy & admin xử lý đơn qua /vendor và /admin */
export const ordersRouter = Router();

ordersRouter.use(authenticate, requireRole('STUDENT'));

ordersRouter.post('/', async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const { order, created } = await ordersService.create(currentUser(req).id, input);
  // 201 khi tạo mới, 200 khi trả lại đơn đã tạo trước đó với cùng idempotencyKey
  sendSuccess(res, { order, created }, created ? 201 : 200);
});

ordersRouter.get('/', async (req, res) => {
  const query = listOrdersQuery.parse(req.query);
  const { orders, total } = await ordersService.listForStudent(currentUser(req).id, query);
  sendSuccess(res, orders, 200, buildPaginationMeta(query.page, query.pageSize, total));
});

ordersRouter.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  sendSuccess(res, { order: await ordersService.detailForStudent(currentUser(req).id, id) });
});

ordersRouter.post('/:id/review', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const review = await createReviewForOrder(currentUser(req).id, id, createReviewSchema.parse(req.body));
  sendSuccess(res, { review }, 201);
});

ordersRouter.post('/:id/cancel', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { reason } = cancelOrderSchema.parse(req.body ?? {});
  sendSuccess(res, { order: await ordersService.cancelByStudent(currentUser(req).id, id, reason) });
});
