import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { visibleMenuItemWhere } from '../catalog/catalog.mappers.js';

export const categoriesRouter = Router();

// Danh mục đang hoạt động, kèm số món đang bán trong mỗi danh mục
categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.foodCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { menuItems: { where: visibleMenuItemWhere } } } },
  });
  sendSuccess(
    res,
    categories.map(({ _count, createdAt: _c, updatedAt: _u, isActive: _a, ...c }) => ({ ...c, itemCount: _count.menuItems })),
  );
});
