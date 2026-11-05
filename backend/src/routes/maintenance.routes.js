import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { isSuperAdmin } from '../../../shared/adminAccess.js';
import { getWebsiteSettings, updateWebsiteSettings } from '../services/cms.service.js';

const router = Router();
router.use(authenticate, (req, res, next) => {
  if (!isSuperAdmin(req.user)) return next(new AppError('Only a super admin can manage maintenance mode.', 403, 'FORBIDDEN'));
  next();
});
const status = settings => ({ maintenanceEnabled: settings.maintenanceEnabled ?? false,
  maintenanceMessage: settings.maintenanceMessage || 'Our website is under maintenance. Please check back soon.' });
router.get('/', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  ApiResponse.success(res, 'Maintenance settings', status(await getWebsiteSettings()));
}));
router.put('/', validate({ body: z.object({ maintenanceEnabled: z.boolean(),
  maintenanceMessage: z.string().trim().min(1, 'Enter a maintenance message.').max(1000) }).strict() }),
asyncHandler(async (req, res) => {
  ApiResponse.success(res, 'Maintenance settings saved.', status(await updateWebsiteSettings(req.body, req.user._id)));
}));
export default router;
