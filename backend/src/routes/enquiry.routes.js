import { Router } from 'express';
import {
  createEnquiry, createAvailability, sendCustomerMessage, readCustomerReplies,
  fetchMyEnquiries,
  fetchMyEnquiryById,
} from '../controllers/enquiry.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createEnquirySchema, availabilityEnquirySchema, customerEnquiryMessageSchema, readEnquiryRepliesSchema,
  getEnquiryByIdSchema,
  getEnquiriesQuerySchema,
} from '../validators/enquiry.validator.js';

const router = Router();

// Protected Customer / Dealer Enquiry Operations
router.use(authenticate, authorize('customer', 'dealer'));

router.post('/availability', validate(availabilityEnquirySchema), createAvailability);
router.post('/:id/messages', validate(customerEnquiryMessageSchema), sendCustomerMessage);
router.post('/:id/read', validate(readEnquiryRepliesSchema), readCustomerReplies);
router.post('/', validate(createEnquirySchema), createEnquiry);
router.get('/', validate(getEnquiriesQuerySchema), fetchMyEnquiries);
router.get('/:id', validate(getEnquiryByIdSchema), fetchMyEnquiryById);

export default router;
