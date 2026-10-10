import { Router } from 'express';
import { BENTO_TRANSITIONS } from '../../../shared/bannerGrid.js';
import { z } from 'zod';
import BannerGrid from '../models/BannerGrid.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { storeLocalThemeImage } from '../services/themeAssets.service.js';
import { storageService } from '../services/storage/storage.service.js';
import { config } from '../config/env.js';

export const gridImageInput = z.object({
  title: z.string().trim().max(150).default(''),
  link: z.string().trim().max(2000).refine(v => !v || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v), 'Use a relative path or an http(s) URL').default(''),
  fit: z.enum(['cover', 'contain']).default('cover'),
  positionX: z.coerce.number().min(0).max(100).default(50),
  positionY: z.coerce.number().min(0).max(100).default(50),
  zoom: z.coerce.number().min(1).max(3).default(1),
  revision: z.coerce.number().int().min(0),
});
export const gridSectionInput = z.object({
  transition: z.enum(BENTO_TRANSITIONS),
  revision: z.coerce.number().int().min(0),
});
const emptySections = () => Array.from({ length: 4 }, () => ({ images: [], transition: 'fade' }));
const input = body => {
  const result = gridImageInput.safeParse(body);
  if (!result.success) throw new AppError(result.error.issues.map(i => i.message).join('; '), 400, ERROR_CODES.VALIDATION_ERROR);
  return result.data;
};
const sectionIndex = req => {
  if (!/^[0-3]$/.test(req.params.section)) throw new AppError('Choose one of the four banner sections', 400, ERROR_CODES.VALIDATION_ERROR);
  if (req.params.id && !/^[a-f\d]{24}$/i.test(req.params.id)) throw new AppError('Invalid banner image ID', 400, ERROR_CODES.VALIDATION_ERROR);
  return Number(req.params.section);
};
const checked = grid => {
  if (!grid) throw new AppError('This section is full or has changed. Refresh and try again (maximum 3 images).', 409, ERROR_CODES.VALIDATION_ERROR);
  return grid;
};
export const publicBannerGrid = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const grid = await BannerGrid.findOne({ singletonKey: 'primary' }).lean();
  return ApiResponse.success(res, 'Homepage banner grid', { grid: grid?.configured ? grid : null });
});
const router = Router(); // Mounted behind the admin authentication/authorization middleware.
router.get('/', asyncHandler(async (req, res) => {
  const grid = await BannerGrid.findOne({ singletonKey: 'primary' }).lean();
  return ApiResponse.success(res, 'Banner grid', { grid: grid || { sections: emptySections(), revision: 0, configured: false } });
}));
router.put('/:section', asyncHandler(async (req, res) => {
  const section = sectionIndex(req);
  const parsed = gridSectionInput.safeParse(req.body);
  if (!parsed.success) throw new AppError('Choose a valid transition and revision', 400, ERROR_CODES.VALIDATION_ERROR);
  await BannerGrid.updateOne({ singletonKey: 'primary' }, { $setOnInsert: { singletonKey: 'primary', sections: emptySections(), revision: 0, configured: false } }, { upsert: true });
  const grid = checked(await BannerGrid.findOneAndUpdate(
    { singletonKey: 'primary', revision: parsed.data.revision },
    { $set: { [`sections.${section}.transition`]: parsed.data.transition }, $inc: { revision: 1 } },
    { new: true, runValidators: true }
  ));
  return ApiResponse.success(res, 'Section transition updated', { grid });
}));
const uploadImage = asyncHandler(async (req, res) => {
  const section = sectionIndex(req), data = input(req.body);
  if (!req.file || !['image/png', 'image/jpeg', 'image/webp'].includes(req.file.mimetype) || req.file.size > 5 * 1024 * 1024) throw new AppError('Upload a PNG, JPG or WebP image up to 5 MB', 400, ERROR_CODES.VALIDATION_ERROR);
  await BannerGrid.updateOne({ singletonKey: 'primary' }, { $setOnInsert: { singletonKey: 'primary', sections: emptySections(), revision: 0, configured: false } }, { upsert: true });
  const replacing = Boolean(req.params.id);
  const filter = { singletonKey: 'primary', revision: data.revision, ...(replacing ? { [`sections.${section}.images._id`]: req.params.id } : { [`sections.${section}.images.2`]: { $exists: false } }) };
  if (!await BannerGrid.exists(filter)) checked(null);
  let asset;
  if (config.storageProvider === 'development') {
    const local = await storeLocalThemeImage(req.file);
    asset = { url: `${req.protocol}://${req.get('host')}${config.apiBaseUrl}/content/theme-assets/${local.filename}`, publicId: local.publicId };
  } else asset = await storageService.uploadFile({ buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype, folder: 'vinexus/bento-banners', category: 'cms' });
  const image = { url: asset.url, publicId: asset.publicId, title: data.title, link: data.link, fit: data.fit, positionX: data.positionX, positionY: data.positionY, zoom: data.zoom };
  const update = replacing ? { $set: Object.fromEntries(Object.entries(image).map(([key, value]) => [`sections.${section}.images.$[image].${key}`, value])), $inc: { revision: 1 } } : { $push: { [`sections.${section}.images`]: image }, $set: { configured: true }, $inc: { revision: 1 } };
  const grid = checked(await BannerGrid.findOneAndUpdate(filter, update, { ...(replacing ? { arrayFilters: [{ 'image._id': req.params.id }] } : {}), new: true, runValidators: true }));
  return ApiResponse.success(res, 'Banner added to section', { grid });
});
router.post('/:section/images', uploadSingle('file', 'cms'), uploadImage);
router.post('/:section/images/:id', uploadSingle('file', 'cms'), uploadImage);
router.put('/:section/images/:id', asyncHandler(async (req, res) => {
  const section = sectionIndex(req), data = input(req.body);
const grid = checked(await BannerGrid.findOneAndUpdate({ singletonKey: 'primary', revision: data.revision, [`sections.${section}.images._id`]: req.params.id }, { $set: { [`sections.${section}.images.$[image].title`]: data.title, [`sections.${section}.images.$[image].link`]: data.link, [`sections.${section}.images.$[image].fit`]: data.fit, [`sections.${section}.images.$[image].positionX`]: data.positionX, [`sections.${section}.images.$[image].positionY`]: data.positionY, [`sections.${section}.images.$[image].zoom`]: data.zoom }, $inc: { revision: 1 } }, { arrayFilters: [{ 'image._id': req.params.id }], new: true, runValidators: true }));
  return ApiResponse.success(res, 'Banner updated', { grid });
}));
router.delete('/:section/images/:id', asyncHandler(async (req, res) => {
  const section = sectionIndex(req);
  const revision = z.coerce.number().int().min(0).safeParse(req.body?.revision);
  if (!revision.success) throw new AppError('A valid revision is required', 400, ERROR_CODES.VALIDATION_ERROR);
  const grid = checked(await BannerGrid.findOneAndUpdate({ singletonKey: 'primary', revision: revision.data, [`sections.${section}.images._id`]: req.params.id }, { $pull: { [`sections.${section}.images`]: { _id: req.params.id } }, $inc: { revision: 1 } }, { new: true, runValidators: true }));
  // Keep stored files: removing a placement does not destroy the original upload.
  return ApiResponse.success(res, 'Banner removed from section', { grid });
}));
export default router;
