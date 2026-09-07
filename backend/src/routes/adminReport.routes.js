import { Router } from 'express';
import {
  getSummaryReport,
  getEnquiriesReport,
  getDealersReport,
  getCustomersReport,
} from '../controllers/adminReport.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getEnquiryReportQuerySchema,
  getDealerReportQuerySchema,
  getCustomerReportQuerySchema,
} from '../validators/report.validator.js';

const router = Router();

// Protected Admin Reports Operations
router.use(authenticate, authorize('admin'));

router.get('/summary', getSummaryReport);
router.get('/enquiries', validate(getEnquiryReportQuerySchema), getEnquiriesReport);
router.get('/dealers', validate(getDealerReportQuerySchema), getDealersReport);
router.get('/customers', validate(getCustomerReportQuerySchema), getCustomersReport);

export default router;
