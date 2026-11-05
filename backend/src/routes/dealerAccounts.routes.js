import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { revokeDealerStatus } from '../services/dealer.service.js';
import { getDealerByIdSchema, getDealersQuerySchema, adminRevokeDealerSchema } from '../validators/dealer.validator.js';
const router = Router();
router.use(authenticate, authorize('admin'));
const userFields = 'fullName email phone role accountStatus isPhoneVerified isEmailVerified createdAt';
const populate = query => query.populate('userId', userFields).populate('kycVerifiedBy', 'fullName email role isEmployee').populate('kycReviewedBy', 'fullName email role isEmployee');
const withoutProfile = user => ({ _id: user._id, userId: user, companyName: user.fullName, status: 'pending', kycDocuments: [], hasDealerProfile: false, createdAt: user.createdAt });
const account = async id => {
  const profile = await populate(DealerProfile.findById(id));
  if (profile?.userId?.role === 'dealer') return profile;
  const user = await User.findOne({ _id: id, role: 'dealer' }).select(userFields).lean();
  if (!user) throw new AppError('Dealer account not found.', 404, 'NOT_FOUND');
  return await populate(DealerProfile.findOne({ userId: user._id })) || withoutProfile(user);
};
router.get('/', validate(getDealersQuerySchema), asyncHandler(async (req, res) => {
  const { page, limit, status, city, state, search, sortBy, sortOrder } = req.query;
  const escaped = value => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = {};
  if (status) filter['business.status'] = status === 'pending' ? { $in: ['pending', null] } : status;
  if (city) filter['business.city'] = escaped(city);
  if (state) filter['business.state'] = escaped(state);
  if (search) {
    const regex = escaped(search);
    filter.$or = ['fullName', 'email', 'phone', 'business.companyName', 'business.gstin', 'business.pan'].map(key => ({ [key]: regex }));
  }
  const sortKey = sortBy === 'createdAt' ? 'createdAt' : `business.${sortBy}`;
  const [result] = await User.aggregate([
    { $match: { role: 'dealer' } },
    { $project: Object.fromEntries(userFields.split(' ').map(key => [key, 1])) },
    { $lookup: { from: DealerProfile.collection.name, localField: '_id', foreignField: 'userId', as: 'business' } },
    { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
    { $match: filter },
    { $facet: { count: [{ $count: 'total' }], users: [{ $sort: { [sortKey]: sortOrder === 'asc' ? 1 : -1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }] } },
  ]);
  const total = result.count[0]?.total || 0;
  let rows = result.users.map(({ business, ...user }) => business ? { ...business, userId: user } : withoutProfile(user));
  // Lookup bypasses schema select:false; keep the Aadhaar number private.
  rows = rows.map(({ aadhaarNumber, ...profile }) => profile);
  rows = await DealerProfile.populate(rows, [{ path: 'kycVerifiedBy', select: 'fullName email role isEmployee' }, { path: 'kycReviewedBy', select: 'fullName email role isEmployee' }]);
  ApiResponse.success(res, 'Dealer accounts', { dealers: rows, pagination: { total, totalItems: total, totalPages: Math.ceil(total / limit) || 1, currentPage: page, page, limit } });
}));
router.get('/:id', validate(getDealerByIdSchema), asyncHandler(async (req, res) => {
  ApiResponse.success(res, 'Dealer account', { profile: await account(req.params.id) });
}));
router.put('/:id/status', validate({ ...getDealerByIdSchema, body: z.object({ accountStatus: z.enum(['active', 'blocked']) }).strict() }), asyncHandler(async (req, res) => {
  const profile = await account(req.params.id);
  const user = await User.findOneAndUpdate({ _id: profile.userId._id, role: 'dealer' }, { $set: { accountStatus: req.body.accountStatus, status: req.body.accountStatus } }, { new: true });
  if (!user) throw new AppError('Dealer account not found.', 404, 'NOT_FOUND');
  if (req.body.accountStatus === 'blocked') await Session.updateMany({ userId: user._id, isActive: true }, { $set: { isActive: false, revokedAt: new Date() } });
  ApiResponse.success(res, 'Dealer account status saved.', { profile: await account(req.params.id) });
}));
router.put('/:id/revoke', validate(adminRevokeDealerSchema), asyncHandler(async (req, res) => {
  const profile = await account(req.params.id);
  if (profile.hasDealerProfile === false) throw new AppError('This account has no approved dealer profile.', 409, 'CONFLICT');
  ApiResponse.success(res, 'Wholesale access revoked.', { profile: await revokeDealerStatus(profile._id, req.body?.reason, req.user._id) });
}));
export default router;
