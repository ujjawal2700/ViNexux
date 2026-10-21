import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import { verifyUnsubscribeToken } from '../services/campaign.service.js';
const router = Router();
const reply = (res, data) => ApiResponse.success(res, 'Notification preferences', data);
router.get('/unsubscribe', asyncHandler(async (req, res) => {
  const user = await User.findById(verifyUnsubscribeToken(req.query.token)).select('marketingPreferences');
  if (!user) throw new AppError('Account no longer exists.', 404, 'NOT_FOUND');
  reply(res, { subscribed: user.marketingPreferences?.email === true });
}));
router.post('/unsubscribe', asyncHandler(async (req, res) => {
  await User.updateOne({ _id: verifyUnsubscribeToken(req.body.token) }, { $set: { 'marketingPreferences.email': false, 'marketingPreferences.updatedAt': new Date() } });
  reply(res, { subscribed: false });
}));
router.post('/unsubscribe/:token', asyncHandler(async (req, res) => {
  await User.updateOne({ _id: verifyUnsubscribeToken(req.params.token) }, { $set: { 'marketingPreferences.email': false, 'marketingPreferences.updatedAt': new Date() } });
  reply(res, { subscribed: false });
}));
router.use(authenticate);
router.get('/preferences', asyncHandler(async (req, res) => reply(res, { preferences: { email: req.user.marketingPreferences?.email === true, push: req.user.marketingPreferences?.push === true } })));
router.patch('/preferences', asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.boolean().optional(), push: z.boolean().optional() }).strict()
    .refine(value => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) throw new AppError('Choose email or push preferences.', 400, 'VALIDATION_ERROR');
  const updates = Object.fromEntries(Object.entries(parsed.data).map(([channel, enabled]) => [`marketingPreferences.${channel}`, enabled]));
  await User.updateOne({ _id: req.user._id }, { $set: { ...updates, 'marketingPreferences.updatedAt': new Date() } });
  reply(res, { preferences: { email: req.user.marketingPreferences?.email === true, push: req.user.marketingPreferences?.push === true, ...parsed.data } });
}));
router.put('/preferences', asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.boolean(), push: z.boolean() }).strict().safeParse(req.body);
  if (!parsed.success) throw new AppError('Choose email and push preferences.', 400, 'VALIDATION_ERROR');
  await User.updateOne({ _id: req.user._id }, { $set: { marketingPreferences: { ...parsed.data, updatedAt: new Date() } } });
  reply(res, { preferences: parsed.data });
}));
export default router;
