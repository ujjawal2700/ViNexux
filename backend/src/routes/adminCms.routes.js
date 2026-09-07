import { Router } from 'express';
import {
  addBanner,
  fetchBanners,
  fetchBannerById,
  editBanner,
  removeBanner,
  addPromoBanner,
  fetchPromoBanners,
  fetchPromoBannerById,
  editPromoBanner,
  removePromoBanner,
  addCmsPage,
  fetchCmsPages,
  fetchCmsPageById,
  editCmsPage,
  removeCmsPage,
  addTrustBadge,
  fetchTrustBadges,
  fetchTrustBadgeById,
  editTrustBadge,
  removeTrustBadge,
  fetchFooterContentAdmin,
  editFooterContentAdmin,
  uploadBannerImg,
  uploadPromoBannerImg,
  uploadTrustBadgeIconImg,
} from '../controllers/adminCms.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import {
  getByIdSchema,
  bannerSchema,
  updateBannerSchema,
  promoBannerSchema,
  updatePromoBannerSchema,
  cmsPageSchema,
  updateCmsPageSchema,
  trustBadgeSchema,
  updateTrustBadgeSchema,
  footerContentSchema,
} from '../validators/cms.validator.js';

const router = Router();

// Protected Admin CMS Operations
router.use(authenticate, authorize('admin'));

// --- Hero Banners ---
router.post('/banners', validate(bannerSchema), addBanner);
router.get('/banners', fetchBanners);
router.get('/banners/:id', validate(getByIdSchema), fetchBannerById);
router.put('/banners/:id', validate(updateBannerSchema), editBanner);
router.delete('/banners/:id', validate(getByIdSchema), removeBanner);
router.post('/banners/:id/image', uploadSingle('file', 'cms'), uploadBannerImg);

// --- Promotional Banners ---
router.post('/promotional-banners', validate(promoBannerSchema), addPromoBanner);
router.get('/promotional-banners', fetchPromoBanners);
router.get('/promotional-banners/:id', validate(getByIdSchema), fetchPromoBannerById);
router.put('/promotional-banners/:id', validate(updatePromoBannerSchema), editPromoBanner);
router.delete('/promotional-banners/:id', validate(getByIdSchema), removePromoBanner);
router.post('/promotional-banners/:id/image', uploadSingle('file', 'cms'), uploadPromoBannerImg);

// --- CMS Pages ---
router.post('/pages', validate(cmsPageSchema), addCmsPage);
router.get('/pages', fetchCmsPages);
router.get('/pages/:id', validate(getByIdSchema), fetchCmsPageById);
router.put('/pages/:id', validate(updateCmsPageSchema), editCmsPage);
router.delete('/pages/:id', validate(getByIdSchema), removeCmsPage);

// --- Trust Badges ---
router.post('/trust-badges', validate(trustBadgeSchema), addTrustBadge);
router.get('/trust-badges', fetchTrustBadges);
router.get('/trust-badges/:id', validate(getByIdSchema), fetchTrustBadgeById);
router.put('/trust-badges/:id', validate(updateTrustBadgeSchema), editTrustBadge);
router.delete('/trust-badges/:id', validate(getByIdSchema), removeTrustBadge);
router.post('/trust-badges/:id/image', uploadSingle('file', 'cms'), uploadTrustBadgeIconImg);

// --- Footer Content ---
router.get('/footer-content', fetchFooterContentAdmin);
router.put('/footer-content', validate(footerContentSchema), editFooterContentAdmin);

export default router;

