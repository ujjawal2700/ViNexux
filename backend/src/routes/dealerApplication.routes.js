import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { dealerApplicationSchema } from '../validators/dealer.validator.js';
import { getApplication, saveApplication, submitApplication, uploadApplicationDocument } from '../services/dealerApplication.service.js';
const router = Router();
router.use(authenticate);
router.get('/', authorize('customer', 'dealer'), asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  ApiResponse.success(res, 'Dealer application', { profile: await getApplication(req.user._id) });
}));
router.put('/', authorize('customer'), validate(dealerApplicationSchema), asyncHandler(async (req, res) => {
  ApiResponse.success(res, 'Business details saved. Upload your documents to continue.', { profile: await saveApplication(req.user._id, req.body) });
}));
router.post('/documents/:type', authorize('customer'), validate({ params: z.object({ type: z.enum(['gst', 'aadhaar', 'msme']) }) }), uploadSingle('file', 'kyc'), asyncHandler(async (req, res) => {
  ApiResponse.success(res, 'Document uploaded.', { profile: await uploadApplicationDocument(req.user._id, req.params.type, req.file) });
}));
router.post('/submit', authorize('customer'), asyncHandler(async (req, res) => {
  ApiResponse.success(res, 'Application submitted. Your account stays a customer account until approval.', { profile: await submitApplication(req.user._id) });
}));
router.use((error, req, res, next) => {
  if (error.code === 11000 || error.name === 'VersionError') return next(Object.assign(new Error('Your application changed. Reload it and try again.'), { statusCode: 409, errorCode: 'CONFLICT' }));
  next(error);
});
export default router;
