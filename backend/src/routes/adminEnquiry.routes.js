import { Router } from 'express';
import {
  fetchAllEnquiries,
  fetchAdminEnquiryById,
  changeEnquiryStatus,
  syncEnquiryToGoogleSheet,
  resendEnquiryWhatsAppNotification,
} from '../controllers/enquiry.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getEnquiryByIdSchema,
  adminUpdateEnquiryStatusSchema,
  getEnquiriesQuerySchema,
} from '../validators/enquiry.validator.js';

const router = Router();

// Protected Admin Enquiry Management Operations
router.use(authenticate, authorize('admin'));

router.get('/', validate(getEnquiriesQuerySchema), fetchAllEnquiries);
router.get('/:id', validate(getEnquiryByIdSchema), fetchAdminEnquiryById);
router.put('/:id', validate(adminUpdateEnquiryStatusSchema), changeEnquiryStatus);
router.put('/:id/status', validate(adminUpdateEnquiryStatusSchema), changeEnquiryStatus);
router.post('/:id/sync-google-sheet', validate(getEnquiryByIdSchema), syncEnquiryToGoogleSheet);
router.post('/:id/resend-whatsapp', validate(getEnquiryByIdSchema), resendEnquiryWhatsAppNotification);

export default router;

