import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { adminArrivalService } from '../services/adminArrival.service.js';
import { Router } from 'express';
import { getDashboard } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Protected Admin Dashboard Route
router.get('/dashboard', authenticate, authorize('admin'), getDashboard);

export const requireArrivalSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' || req.user.isEmployee === true) return next(new AppError('Super admin access required.', 403, 'FORBIDDEN'));
  next();
};
router.get('/arrivals', authenticate, requireArrivalSuperAdmin, validate({ query: z.object({ after: z.string().regex(/^[a-f\d]{24}$/i).optional() }) }), asyncHandler(async (req, res) => ApiResponse.success(res, 'New orders and enquiries', await adminArrivalService.list(req.query.after))));

export default router;
