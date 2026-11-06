import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { seoPage } from '../services/seo.service.js';
import { serveSitemap } from '../controllers/sitemap.controller.js';
const router = Router();
router.get('/page', validate({ query: z.object({ path: z.string().max(1000).default('/') }) }), asyncHandler(async (req, res) => {
  const page = await seoPage(req.query.path);
  res.set('Cache-Control', page.status === 200 && !page.metadata?.robots?.includes('noindex') ? 'public, max-age=60' : 'no-store');
  ApiResponse.success(res, 'Public page metadata', { page });
}));
router.get('/:file', asyncHandler(async (req, res) => {
  return serveSitemap(req.params.file, res);
}));
export default router;
