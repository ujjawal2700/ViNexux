import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { seoPage, sitemap } from '../services/seo.service.js';
import { getPublicWebsiteSettings } from '../services/cms.service.js';
const router = Router();
router.get('/page', validate({ query: z.object({ path: z.string().max(1000).default('/') }) }), asyncHandler(async (req, res) => {
  const page = await seoPage(req.query.path);
  res.set('Cache-Control', page.status === 200 && !page.metadata?.robots?.includes('noindex') ? 'public, max-age=60' : 'no-store');
  ApiResponse.success(res, 'Public page metadata', { page });
}));
router.get('/:file', asyncHandler(async (req, res) => {
  if (!/^sitemap(?:-pages|-products-[1-9]\d*)?\.xml$/.test(req.params.file)) return res.status(404).end();
  const settings = await getPublicWebsiteSettings();
  if (settings.maintenanceEnabled) { res.set('Retry-After', '60'); return res.status(503).end(); }
  const body = await sitemap(req.params.file);
  if (!body) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=300'); res.type('application/xml').send(body);
}));
export default router;
