import { Router } from 'express';
import {
  getDealers,
  getDealer,
  approveKyc,
  rejectKyc,
  revokeDealer,
} from '../controllers/adminDealer.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getDealerByIdSchema,
  adminApproveKycSchema,
  adminRejectKycSchema,
  adminRevokeDealerSchema,
  getDealersQuerySchema,
} from '../validators/dealer.validator.js';

const router = Router();

// Protected Admin Dealer & KYC Operations
router.get('/', authenticate, authorize('admin'), validate(getDealersQuerySchema), getDealers);
router.get('/:id', authenticate, authorize('admin'), validate(getDealerByIdSchema), getDealer);
router.put('/:id/kyc/approve', authenticate, authorize('admin'), validate(adminApproveKycSchema), approveKyc);
router.put('/:id/kyc/reject', authenticate, authorize('admin'), validate(adminRejectKycSchema), rejectKyc);
router.put('/:id/revoke', authenticate, authorize('admin'), validate(adminRevokeDealerSchema), revokeDealer);

export default router;
