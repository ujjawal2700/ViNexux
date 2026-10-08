import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import SeasonalTheme from '../models/SeasonalTheme.js';
import WebsiteSettings from '../models/WebsiteSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import storageService from '../services/storage/storage.service.js';
import { themeConfigSchema as config, themeInputSchema as input } from '../validators/theme.validator.js';
import { getActiveTheme } from '../services/theme.service.js';
import { config as environment } from '../config/env.js';
import { storeLocalThemeImage } from '../services/themeAssets.service.js';

const parse = (schema, body) => { const result = schema.safeParse(body); if (!result.success) throw new AppError(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '), 400); return result.data; };
const find = async id => { if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid theme ID', 400); const theme = await SeasonalTheme.findById(id); if (!theme) throw new AppError('Theme not found', 404); return theme; };
const checkRevision = (theme, body) => { if (body?.revision !== theme.revision) throw new AppError('Theme changed in another session. Reload before saving.', 409, ERROR_CODES.CONFLICT); };
export const publicTheme = asyncHandler(async (req, res) => {
  const theme = await getActiveTheme();
  res.set('Cache-Control', 'no-store');
  ApiResponse.success(res, 'Store theme', { theme });
});
const router = Router(); // Mounted beneath the authenticated admin CMS router.
router.get('/', asyncHandler(async (req, res) => ApiResponse.success(res, 'Themes', { themes: await SeasonalTheme.find().sort({ updatedAt: -1 }).lean(), active: await getActiveTheme() })));
router.get('/:id', asyncHandler(async (req, res) => ApiResponse.success(res, 'Theme', { theme: await find(req.params.id) })));
router.post('/', asyncHandler(async (req, res) => { const data = parse(input, req.body); ApiResponse.success(res, 'Theme created', { theme: await SeasonalTheme.create({ ...data, updatedBy: req.user._id }) }, 201); }));
router.put('/:id', asyncHandler(async (req, res) => {
  const data = parse(input, req.body); const theme = await find(req.params.id); checkRevision(theme, data);
  // Atomic compare-and-swap protects against simultaneous editors.
  const saved = await SeasonalTheme.findOneAndUpdate({ _id: theme._id, revision: data.revision }, { $set: { name: data.name, preset: data.preset, draft: data.draft, schedule: data.schedule, updatedBy: req.user._id }, $inc: { revision: 1 } }, { new: true });
  if (!saved) throw new AppError('Theme changed in another session. Reload before saving.', 409);
  ApiResponse.success(res, 'Draft saved', { theme: saved });
}));
router.post('/:id/:action', asyncHandler(async (req, res) => {
  const theme = await find(req.params.id); const action = req.params.action;
  if (!['publish', 'activate', 'archive', 'duplicate'].includes(action)) throw new AppError('Unknown theme action', 400);
  checkRevision(theme, req.body);
  if (action === 'duplicate') { ApiResponse.success(res, 'Theme duplicated', { theme: await SeasonalTheme.create({ name: `${theme.name.slice(0, 90)} (copy)`, preset: theme.preset, draft: theme.draft, updatedBy: req.user._id }) }, 201); return; }
  if (action === 'activate') {
    if (!theme.published || theme.archived) throw new AppError('Publish a non-archived theme before activating', 400);
    await WebsiteSettings.findOneAndUpdate({ singletonKey: 'primary' }, { $set: { activeThemeId: theme._id } }, { upsert: true });
  } else {
    const changes = action === 'publish' ? { published: parse(config, theme.draft), publishedSchedule: { enabled: theme.schedule.enabled, startAt: theme.schedule.startAt, endAt: theme.schedule.endAt, priority: theme.schedule.priority }, publishedAt: new Date(), archived: false, history: [...theme.history, { config: theme.published || null, publishedAt: theme.publishedAt || null }].slice(-10) } : { archived: true };
    const saved = await SeasonalTheme.findOneAndUpdate({ _id: theme._id, revision: theme.revision }, { $set: { ...changes, updatedBy: req.user._id }, $inc: { revision: 1 } }, { new: true });
    if (!saved) throw new AppError('Theme changed in another session. Reload before publishing.', 409);
    if (action === 'archive') await WebsiteSettings.updateOne({ singletonKey: 'primary', activeThemeId: theme._id }, { $set: { activeThemeId: null } });
  }
  ApiResponse.success(res, 'Theme updated', { theme: await find(theme._id), active: await getActiveTheme() });
}));
router.post('/:id/assets/:slot', uploadSingle('file', 'cms'), asyncHandler(async (req, res) => {
  await find(req.params.id);
  if (!['header', 'background', 'footer'].includes(req.params.slot)) throw new AppError('Invalid decoration slot', 400);
  let file;
  if (['development', 'dev'].includes(environment.storageProvider) && environment.nodeEnv !== 'test') {
    const local = await storeLocalThemeImage(req.file);
    file = { url: `${req.protocol}://${req.get('host')}${environment.apiBaseUrl}/content/theme-assets/${local.filename}`, publicId: local.publicId };
  } else file = await storageService.uploadFile({ ...req.file, folder: 'cms/themes', category: 'cms' });
  // Kept until explicitly referenced by a saved draft; never delete assets still used by published history.
  ApiResponse.success(res, 'Decoration uploaded', { asset: { url: file.url, publicId: file.publicId } });
}));
export const resetTheme = asyncHandler(async (req, res) => {
  const { resumeSchedules } = parse(z.object({ resumeSchedules: z.boolean() }), req.body);
  await WebsiteSettings.findOneAndUpdate({ singletonKey: 'primary' }, { $set: { activeThemeId: resumeSchedules ? null : 'default' } }, { upsert: true });
  ApiResponse.success(res, resumeSchedules ? 'Schedules resumed' : 'Default theme restored', { active: await getActiveTheme() });
});
export default router;
