import { Router } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { stallsService } from './stalls.service.js';

export const stallsRouter = Router();

const listQuery = z.object({ q: z.string().trim().max(100).optional() });

stallsRouter.get('/', async (req, res) => {
  const { q } = listQuery.parse(req.query);
  sendSuccess(res, await stallsService.list({ q: q || undefined }));
});

// Nhận cả ID (số) và slug: /stalls/1 hoặc /stalls/bep-nha-sinh-vien
stallsRouter.get('/:idOrSlug', async (req, res) => {
  const { idOrSlug } = z.object({ idOrSlug: z.string().trim().min(1).max(140) }).parse(req.params);
  sendSuccess(res, await stallsService.detail(idOrSlug));
});
