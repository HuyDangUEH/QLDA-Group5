import { Router } from 'express';
import { buildPaginationMeta, sendSuccess } from '../../utils/response.js';
import { idParamSchema } from '../../utils/validation.js';
import { listMenuItemsQuery } from './menu-items.schemas.js';
import { menuItemsService } from './menu-items.service.js';

export const menuItemsRouter = Router();

// ?q=&categoryId=&stallId=&minPrice=&maxPrice=&available=true&featured=true&sort=popular&page=1&pageSize=12
menuItemsRouter.get('/', async (req, res) => {
  const query = listMenuItemsQuery.parse(req.query);
  const { items, total } = await menuItemsService.list(query);
  sendSuccess(res, items, 200, buildPaginationMeta(query.page, query.pageSize, total));
});

menuItemsRouter.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  sendSuccess(res, await menuItemsService.detail(id));
});
