import { Router } from 'express';
import { publicTheme } from './theme.routes.js';
import { publicBannerGrid } from './bannerGrid.routes.js';
import { THEME_ASSET_DIRECTORY } from '../services/themeAssets.service.js';
import {
  fetchPublicBanners,
  fetchPublicPromoBanners,
  fetchPublicCmsPageBySlug,
  fetchPublicTrustBadges,
  fetchPublicFooterContent,
  fetchPublicWebsiteSettings,
} from '../controllers/publicCms.controller.js';
import { validate } from '../middlewares/validate.js';
import { getPageBySlugSchema } from '../validators/cms.validator.js';
import { publicCache } from '../middlewares/cacheControl.js';

const router = Router();

// Public Content Endpoints (No authentication required)
router.use(publicCache());
router.get('/theme', publicTheme);
router.get('/banner-grid', publicBannerGrid);
router.get('/theme-assets/:filename', (req, res, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(req.params.filename)) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(req.params.filename, { root: THEME_ASSET_DIRECTORY, dotfiles: 'deny' }, err => { if (err) next(err); });
});

router.get('/banners', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, fetchPublicBanners);
router.get('/promotional-banners', fetchPublicPromoBanners);
router.get('/pages/:slug', validate(getPageBySlugSchema), fetchPublicCmsPageBySlug);
router.get('/trust-badges', fetchPublicTrustBadges);
router.get('/footer-content', fetchPublicFooterContent);
router.get('/website-settings', fetchPublicWebsiteSettings);

export default router;
