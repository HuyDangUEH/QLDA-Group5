import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { sendSuccess } from '../../utils/response.js';

export const pickupLocationsRouter = Router();

// Điểm nhận món đang hoạt động
pickupLocationsRouter.get('/', async (_req, res) => {
  const locations = await prisma.campusPickupLocation.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, building: true, description: true },
  });
  sendSuccess(res, locations);
});
