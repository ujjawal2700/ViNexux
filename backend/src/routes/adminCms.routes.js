import { Router } from 'express';
import { uploadImage, deleteImage } from '../controllers/upload.controller.js';
import { PromotionalBanner } from '../models/PromotionalBanner.js';
import { AppError } from '../utils/AppError.js';
import themeRoutes, { resetTheme } from './theme.routes.js';
import bannerGridRoutes from './bannerGrid.routes.js';
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
  fetchWebsiteSettingsAdmin,
  editWebsiteSettingsAdmin,
  uploadWebsiteAssetImg,
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
  websiteSettingsSchema,
  websiteAssetSchema,
} from '../validators/cms.validator.js';

const router = Router();

// Protected Admin CMS Operations
router.use(authenticate, authorize('admin'));
router.use('/banner-grid', bannerGridRoutes);
router.post('/themes/reset', resetTheme);
router.use('/themes', themeRoutes);

// --- Hero Banners ---
router.post('/banners', validate(bannerSchema), addBanner);
router.get('/banners', fetchBanners);
router.get('/banners/:id', validate(getByIdSchema), fetchBannerById);
router.put('/banners/:id', validate(updateBannerSchema), editBanner);
router.delete('/banners/:id', validate(getByIdSchema), removeBanner);
router.post('/banners/:id/image', uploadSingle('file', 'cms'), uploadBannerImg);

// --- Promotional Banners ---
router.post('/promotional-banners/images', uploadSingle('file', 'cms'), (req, res, next) => {
  req.body.folder = 'vinexus/promotional-banners';
  req.body.category = 'cms';
  return uploadImage(req, res, next);
});
router.delete('/promotional-banners/images', async (req, res, next) => {
  try {
    const publicId = req.body?.publicId;
    if (typeof publicId !== 'string' || publicId.length > 500 || !/^vinexus\/promotional-banners\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(publicId)) throw new AppError('Choose a promotional banner upload.', 400, 'VALIDATION_ERROR');
    if (await PromotionalBanner.exists({ 'image.publicId': publicId })) throw new AppError('This image is still used by a promotional banner.', 409, 'CONFLICT');
    return deleteImage(req, res, next);
  } catch (error) { next(error); }
});
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
router.post('/footer-content/images/:kind', (req, res, next) => {
  if (!['bank-qr', 'social'].includes(req.params.kind)) return next(new AppError('Choose a bank QR or social image.', 400, 'VALIDATION_ERROR'));
  next();
}, uploadSingle('file', 'cms'), (req, res, next) => {
  req.body.folder = `vinexus/${req.params.kind}`;
  req.body.category = req.params.kind === 'bank-qr' ? 'qr' : 'cms';
  return uploadImage(req, res, next);
});
router.get('/footer-content', fetchFooterContentAdmin);
router.put('/footer-content', validate(footerContentSchema), editFooterContentAdmin);

// --- Website / SEO Settings ---
router.get('/website-settings', fetchWebsiteSettingsAdmin);
router.put('/website-settings', validate(websiteSettingsSchema), editWebsiteSettingsAdmin);
router.post('/website-settings/:field/image', validate(websiteAssetSchema), uploadSingle('file', 'cms'), uploadWebsiteAssetImg);

export default router;
