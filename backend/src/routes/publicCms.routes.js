import { Router } from 'express';
import {
  fetchPublicBanners,
  fetchPublicPromoBanners,
  fetchPublicCmsPageBySlug,
  fetchPublicTrustBadges,
  fetchPublicFooterContent,
} from '../controllers/publicCms.controller.js';
import { validate } from '../middlewares/validate.js';
import { getPageBySlugSchema } from '../validators/cms.validator.js';

const router = Router();

// Public Content Endpoints (No authentication required)
router.get('/banners', fetchPublicBanners);
router.get('/promotional-banners', fetchPublicPromoBanners);
router.get('/pages/:slug', validate(getPageBySlugSchema), fetchPublicCmsPageBySlug);
router.get('/trust-badges', fetchPublicTrustBadges);
router.get('/footer-content', fetchPublicFooterContent);

export default router;
