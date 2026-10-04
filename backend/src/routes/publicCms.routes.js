import { Router } from 'express';
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

router.get('/banners', fetchPublicBanners);
router.get('/promotional-banners', fetchPublicPromoBanners);
router.get('/pages/:slug', validate(getPageBySlugSchema), fetchPublicCmsPageBySlug);
router.get('/trust-badges', fetchPublicTrustBadges);
router.get('/footer-content', fetchPublicFooterContent);
router.get('/website-settings', fetchPublicWebsiteSettings);

export default router;
