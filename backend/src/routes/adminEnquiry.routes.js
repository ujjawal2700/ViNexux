import mongoose from 'mongoose';
import { Enquiry } from '../models/Enquiry.js';
import { canAdmin } from '../../../shared/adminAccess.js';
import { auditContext } from '../audit/audit.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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
router.use(authenticate, asyncHandler(async (req, res, next) => {
  if (!req.user.isEmployee) return next();
  const action = ['GET', 'HEAD'].includes(req.method) ? 'read' : 'write';
  let type = req.query.userType;
  const recordId = req.path.split('/')[1];
  if (recordId) {
    if (!mongoose.isValidObjectId(recordId)) throw new AppError('Invalid enquiry ID.', 400, 'VALIDATION_ERROR');
    const record = await Enquiry.findById(recordId).select('userType').lean();
    if (!record) throw new AppError('Enquiry not found.', 404, 'NOT_FOUND');
    type = record.userType;
  }
  if (!type) {
    const allowed = ['customer', 'dealer'].filter(value => canAdmin({ role: 'admin', ...req.adminAccess }, `enquiries-${value}s`, action));
    if (allowed.length === 2) { req.adminPermissionSection = 'enquiries-customers'; }
    else if (allowed.length === 1) { type = allowed[0]; req.query.userType = type; }
  }
  if (type) req.adminPermissionSection = `enquiries-${type}s`;
  if (auditContext.getStore()) auditContext.getStore().section = req.adminPermissionSection || 'enquiries';
  next();
}), authorize('admin'));

router.get('/', validate(getEnquiriesQuerySchema), fetchAllEnquiries);
router.get('/:id', validate(getEnquiryByIdSchema), fetchAdminEnquiryById);
router.put('/:id', validate(adminUpdateEnquiryStatusSchema), changeEnquiryStatus);
router.put('/:id/status', validate(adminUpdateEnquiryStatusSchema), changeEnquiryStatus);
router.post('/:id/sync-google-sheet', validate(getEnquiryByIdSchema), syncEnquiryToGoogleSheet);
router.post('/:id/resend-whatsapp', validate(getEnquiryByIdSchema), resendEnquiryWhatsAppNotification);

export default router;

