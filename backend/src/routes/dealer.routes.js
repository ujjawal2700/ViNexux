import { Router } from 'express';
import {
  createProfile,
  getProfile,
  updateProfile,
  uploadKycDoc,
  deleteKycDoc,
} from '../controllers/dealer.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import {
  createDealerProfileSchema,
  updateDealerProfileSchema,
} from '../validators/dealer.validator.js';

const router = Router();

// Dealer Self-Service Profile & KYC Operations
router.post('/profile', authenticate, authorize('dealer'), validate(createDealerProfileSchema), createProfile);
router.get('/profile', authenticate, authorize('dealer'), getProfile);
router.put('/profile', authenticate, authorize('dealer'), validate(updateDealerProfileSchema), updateProfile);

// Dealer KYC Document Storage Routes
router.post('/kyc/documents', authenticate, authorize('dealer'), uploadSingle('file', 'kyc'), uploadKycDoc);
router.delete('/kyc/documents/:type', authenticate, authorize('dealer'), deleteKycDoc);

export default router;

