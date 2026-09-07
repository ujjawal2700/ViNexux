import { Router } from 'express';
import {
  createEnquiry,
  fetchMyEnquiries,
  fetchMyEnquiryById,
} from '../controllers/enquiry.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createEnquirySchema,
  getEnquiryByIdSchema,
  getEnquiriesQuerySchema,
} from '../validators/enquiry.validator.js';

const router = Router();

// Protected Customer / Dealer Enquiry Operations
router.use(authenticate, authorize('customer', 'dealer'));

router.post('/', validate(createEnquirySchema), createEnquiry);
router.get('/', validate(getEnquiriesQuerySchema), fetchMyEnquiries);
router.get('/:id', validate(getEnquiryByIdSchema), fetchMyEnquiryById);

export default router;
