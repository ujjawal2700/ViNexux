import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { isSuperAdmin } from '../../../shared/adminAccess.js';

export const superAdminInput = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).toLowerCase(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number.'),
  password: z.string().min(8).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.'),
}).strict();
const publicAdmin = user => ({ _id: user._id, fullName: user.fullName, email: user.email,
  phone: user.phone, accountStatus: user.accountStatus, createdAt: user.createdAt });
const router = Router();
router.use(authenticate, (req, res, next) => {
  if (!isSuperAdmin(req.user)) return next(new AppError('Only a super admin can manage super admins.', 403, 'FORBIDDEN'));
  next();
});
router.get('/', validate({ query: z.object({ page: z.coerce.number().int().min(1).default(1), search: z.string().trim().max(100).default('') }) }),
  asyncHandler(async (req, res) => {
    // $ne includes legacy super admins created before isEmployee was introduced.
    const filter = { role: 'admin', isEmployee: { $ne: true } };
    if (req.query.search) {
      const search = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = ['fullName', 'email', 'phone'].map(key => ({ [key]: search }));
    }
    const [admins, total] = await Promise.all([
      User.find(filter).select('fullName email phone accountStatus createdAt').sort({ createdAt: -1, _id: -1 }).skip((req.query.page - 1) * 25).limit(25).lean(),
      User.countDocuments(filter),
    ]);
    res.set('Cache-Control', 'no-store');
    ApiResponse.success(res, 'Super admins', { admins: admins.map(publicAdmin), total, page: req.query.page, pages: Math.ceil(total / 25) });
  }));
router.post('/', validate({ body: superAdminInput }), asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const admin = await User.create({ ...data, name: data.fullName, passwordHash: await bcrypt.hash(password, 12),
    role: 'admin', isEmployee: false, accessRoleId: null, accountStatus: 'active', status: 'active',
    isPhoneVerified: true, isEmailVerified: true, createdBy: req.user._id });
  ApiResponse.success(res, 'Super admin created.', { admin: publicAdmin(admin) }, 201);
}));
router.use((error, req, res, next) => {
  if (error.code === 11000) return next(new AppError('That email or phone number is already in use.', 409, 'CONFLICT'));
  next(error);
});
export default router;
