import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { readOpenCode, readPublicOpenCode, saveOpenCode } from '../lib/openCode.js';

export const publicOpenCodeRoutes = Router();
publicOpenCodeRoutes.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-store').json(await readPublicOpenCode());
});
export const adminOpenCodeRoutes = Router();
adminOpenCodeRoutes.use(requireAdmin);
adminOpenCodeRoutes.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-store').json(await readOpenCode());
});
adminOpenCodeRoutes.put('/', async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await saveOpenCode(req.body));
});
