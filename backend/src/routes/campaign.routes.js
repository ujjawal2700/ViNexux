import { campaignValidationError } from '../utils/campaignValidationError.js';
import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Campaign, CampaignDelivery } from '../models/Campaign.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { campaignInput, readyCampaign } from '../validators/campaign.validator.js';
import { campaignProviderStatus, renderCampaignEmail, reviewCampaign, queueCampaign, deliverCampaignMessage } from '../services/campaign.service.js';
import { storeLocalThemeImage } from '../services/themeAssets.service.js';
import storageService from '../services/storage/storage.service.js';
const router = Router();
const fail = (message, status = 400) => { throw new AppError(message, status, 'CAMPAIGN_ERROR'); };
const parse = (schema, value) => { const result = schema.safeParse(value); if (!result.success) throw campaignValidationError(result.error.issues); return result.data; };
const reply = (res, data) => ApiResponse.success(res, 'Campaign studio', data);
const find = async id => { if (!mongoose.isValidObjectId(id)) fail('Invalid campaign ID.'); const item = await Campaign.findById(id).lean(); if (!item) fail('Campaign not found.', 404); return item; };
const draftFields = item => ({ name: item.name, channel: item.channel, audience: item.audience, email: item.email, push: item.push });
router.use(authenticate, authorize('admin'));
router.get('/configuration', (req, res) => reply(res, campaignProviderStatus()));
router.get('/recipients', asyncHandler(async (req, res) => {
  const search = parse(z.string().max(100), req.query.search || '');
  const channel = parse(z.enum(['email', 'push']), req.query.channel || 'email');
  const filter = { role: { $in: ['customer', 'dealer'] }, accountStatus: 'active', status: { $ne: 'blocked' }, [`marketingPreferences.${channel}`]: true };
  if (channel === 'push') filter['fcmTokens.0'] = { $exists: true };
  if (search) { const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = [{ fullName: regex }, { email: regex }]; }
  reply(res, { recipients: await User.find(filter).select('fullName email role').sort({ fullName: 1 }).limit(50).lean() });
}));
router.post('/images', uploadSingle('file', 'cms'), asyncHandler(async (req, res) => {
  let file;
  if (['dev', 'development'].includes(config.storageProvider)) {
    const local = await storeLocalThemeImage(req.file);
    const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}${config.apiBaseUrl}`).replace(/\/$/, '');
    file = { url: `${origin}/content/theme-assets/${local.filename}` };
  } else {
    file = await storageService.uploadFile({ ...req.file, folder: 'cms/campaigns', category: 'cms' });
  }
  reply(res, { url: file.url });
}));
router.get('/', asyncHandler(async (req, res) => {
  const page = parse(z.coerce.number().int().min(1).max(100000).default(1), req.query.page);
  const [campaigns, total] = await Promise.all([Campaign.find().select('name channel status revision totalRecipients deliveryMode createdAt completedAt').sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).lean(), Campaign.countDocuments()]);
  reply(res, { campaigns, page, pages: Math.ceil(total / 25) });
}));
router.post('/', asyncHandler(async (req, res) => reply(res, { campaign: await Campaign.create({ ...parse(campaignInput, req.body), createdBy: req.user._id }) })));
router.get('/:id', asyncHandler(async (req, res) => {
  const campaign = await find(req.params.id);
  const page = parse(z.coerce.number().int().min(1).default(1), req.query.page);
  const [stats, deliveries] = await Promise.all([
    CampaignDelivery.aggregate([{ $match: { campaignId: campaign._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    CampaignDelivery.find({ campaignId: campaign._id }).populate('userId', 'fullName email').sort({ createdAt: 1 }).skip((page - 1) * 25).limit(25).lean(),
  ]);
  reply(res, { campaign, stats: Object.fromEntries(stats.map(s => [s._id, s.count])), deliveries, page, pages: Math.ceil(campaign.totalRecipients / 25) });
}));
router.put('/:id', asyncHandler(async (req, res) => {
  const { revision, ...body } = req.body;
  parse(z.number().int().min(0), revision);
  const previous = await find(req.params.id);
  const data = parse(campaignInput, body);
  if (data.channel !== previous.channel) fail('Create a new campaign to change its channel.');
  const campaign = await Campaign.findOneAndUpdate({ _id: previous._id, status: 'draft', revision }, { $set: data, $inc: { revision: 1 } }, { new: true });
  if (!campaign) fail('This draft changed or has already been queued. Reload it before editing.', 409);
  reply(res, { campaign });
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  const campaign = await find(req.params.id);
  if (!(await Campaign.deleteOne({ _id: campaign._id, status: 'draft' })).deletedCount) fail('Only drafts can be deleted.', 409);
  reply(res, { deleted: true });
}));
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const original = await find(req.params.id);
  reply(res, { campaign: await Campaign.create({ ...draftFields(original), name: `${original.name.slice(0, 110)} (copy)`, createdBy: req.user._id }) });
}));
router.get('/:id/preview', asyncHandler(async (req, res) => {
  const campaign = await find(req.params.id);
  reply(res, campaign.channel === 'email' ? renderCampaignEmail(campaign) : { push: campaign.push });
}));
router.get('/:id/review', asyncHandler(async (req, res) => reply(res, await reviewCampaign(await find(req.params.id)))));
router.post('/:id/queue', asyncHandler(async (req, res) => {
  const data = parse(z.object({ revision: z.number().int().min(0), fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).strict(), req.body);
  await find(req.params.id);
  reply(res, await queueCampaign(req.params.id, data.revision, data.fingerprint, req.user._id));
}));
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const campaign = await find(req.params.id);
  if (!await Campaign.findOneAndUpdate({ _id: campaign._id, status: { $in: ['queued', 'sending'] } }, { $set: { status: 'cancelled', completedAt: new Date() } })) fail('This campaign cannot be cancelled.', 409);
  await CampaignDelivery.updateMany({ campaignId: campaign._id, status: 'pending' }, { $set: { status: 'skipped', reason: 'Campaign cancelled.', finishedAt: new Date() } });
  reply(res, { cancelled: true });
}));
const testLimiter = rateLimit({ windowMs: 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false });
router.post('/:id/test', testLimiter, asyncHandler(async (req, res) => {
  const campaign = await find(req.params.id);
  parse(readyCampaign, draftFields(campaign));
  const providers = campaignProviderStatus();
  if (!providers[campaign.channel].ready || !providers.siteReady) fail('Configure the delivery provider and PUBLIC_SITE_URL before testing.', 409);
  if (campaign.channel === 'email' && !req.user.email) fail('Set your admin email before testing.');
  if (campaign.channel === 'push' && !req.user.fcmTokens?.length) fail('Enable notifications in this browser before testing.');
  reply(res, { result: await deliverCampaignMessage(campaign, req.user) });
}));
export default router;
