import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { Session } from '../models/Session.js';
import { Cart } from '../models/Cart.js';
import { PushDevice } from '../models/PushDevice.js';
import { OtpVerification } from '../models/OtpVerification.js';
import { DealerPricing } from '../models/DealerPricing.js';
import { AppError } from '../utils/AppError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { createDealerProfileSchema } from '../validators/dealer.validator.js';
import { uploadFields } from '../middlewares/upload.middleware.js';
import storageService from './storage/storage.service.js';
import { isSuperAdmin } from '../../../shared/adminAccess.js';

const contact = {
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  address: z.string().trim().max(255).default(''),
  accountStatus: z.enum(['active', 'pending', 'blocked']).default('active'),
};
const business = {
  companyName: z.string().trim().min(2).max(150),
  organisationType: z.enum(['Proprietorship', 'Partnership', 'Limited Liability Partnership (LLP)', 'Private Limited Company', 'Limited Company', 'Others']).default('Proprietorship'),
  gstin: z.string().trim().toUpperCase().regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/).default(''),
  pan: z.string().trim().toUpperCase().regex(/^$|^[A-Z]{5}\d{4}[A-Z]$/).default(''),
  whatsappNumber: z.string().regex(/^$|^[6-9]\d{9}$/).default(''),
  city: z.string().trim().max(100).default(''),
  state: z.string().trim().max(100).default(''),
  pincode: z.string().regex(/^$|^\d{6}$/).default(''),
};
const dealerBusinessBody = z.object(Object.fromEntries(Object.entries(createDealerProfileSchema.body.omit({ kycDocuments: true }).shape).map(([key, schema]) => [key, key === 'companyName' ? schema : z.preprocess(value => typeof value === 'string' && !value.trim() ? undefined : value, schema)]))).strict();
const dealerEnrollmentBody = dealerBusinessBody.extend(contact).strict();
export const accountBody = role => z.object({ ...contact, ...(role === 'dealer' ? business : {}) }).strict();
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid account ID') });
export const superAdminAccountsOnly = (req, res, next) => isSuperAdmin(req.user) ? next() : next(new AppError('Only super admins can create, edit, convert or delete accounts.', 403, 'FORBIDDEN'));

// Accept profile IDs used by the dealer directory as well as user IDs.
async function resolveUser(id, role, session) {
  let user = await User.findOne({ _id: id, role }).session(session);
  if (!user && role === 'dealer') {
    const profile = await DealerProfile.findById(id).session(session);
    if (profile) user = await User.findOne({ _id: profile.userId, role }).session(session);
  }
  if (!user) throw new AppError('Account not found.', 404, 'NOT_FOUND');
  return user;
}
export async function saveAccount({ id, role, data, actorId, converting = false, documents }) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const creating = !id;
      const user = creating ? new User({ role, createdBy: actorId }) : await resolveUser(id, converting ? 'customer' : role, session);
      if (converting && (user.accountStatus !== 'active' || user.status === 'blocked')) throw new AppError('Activate this customer account before converting it to a dealer.', 409, 'CONFLICT');
      // Provision password access without displaying or transmitting a default password.
      // Customers/dealers sign in through the existing OTP flow.
      if (creating) user.passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const previousIdentifiers = [user.email, user.phone].filter(Boolean);
      const changedEmail = !creating && !converting && user.email !== data.email;
      const changedPhone = !creating && !converting && user.phone !== data.phone;
      if (!converting) Object.assign(user, Object.fromEntries(Object.keys(contact).map(key => [key, data[key]])), { name: data.fullName, status: data.accountStatus });
      if (changedEmail) { user.isEmailVerified = false; user.googleId = undefined; }
      if (changedPhone) user.isPhoneVerified = false;
      if (converting) user.role = 'dealer';
      if (converting || changedEmail || changedPhone || data.accountStatus !== 'active') { user.currentSessionId = undefined; user.fcmTokens = []; }
      await user.save({ session });
      if (role === 'dealer') {
        let profile = await DealerProfile.findOne({ userId: user._id }).session(session);
        if (!profile) profile = new DealerProfile({ userId: user._id });
        const keys = creating || converting ? Object.keys(dealerBusinessBody.shape) : Object.keys(business);
        if (creating || converting) {
          for (const key of ['gstin', 'pan']) {
            if (data[key] && await DealerProfile.exists({ [key]: data[key], userId: { $ne: user._id } }).session(session)) throw new AppError(`This ${key.toUpperCase()} is already registered to another dealer.`, 409, 'CONFLICT');
          }
        }
        Object.assign(profile, Object.fromEntries(keys.filter(key => data[key] !== undefined).map(key => [key, data[key]])), data.address !== undefined ? { address: data.address } : {});
        if (documents?.length) profile.kycDocuments = [...(profile.kycDocuments || []).filter(doc => !documents.some(next => next.type === doc.type)), ...documents];
        if (creating || converting) Object.assign(profile, {
          status: 'approved', applicationSource: 'admin', applicationState: 'submitted',
          kycVerifiedBy: actorId, kycVerifiedAt: new Date(), kycReviewedBy: actorId,
          kycReviewedAt: new Date(), kycReviewAction: 'approved', rejectionReason: '',
        });
        await profile.save({ session });
        user.dealerProfileId = profile._id;
        await user.save({ session });
      }
      if (converting || changedEmail || changedPhone || data.accountStatus !== 'active') {
        await Session.updateMany({ userId: user._id, isActive: true }, { $set: { isActive: false, revokedAt: new Date() } }, { session });
        await PushDevice.deleteMany({ userId: user._id }, { session });
        await OtpVerification.deleteMany({ identifier: { $in: previousIdentifiers } }, { session });
      }
      result = { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role, accountStatus: user.accountStatus, ...(role === 'dealer' ? { dealerProfileId: user.dealerProfileId } : {}) };
    });
    return result;
  } catch (error) {
    if (error.code === 11000) throw new AppError('An account with this email or phone already exists.', 409, 'CONFLICT');
    throw error;
  } finally { await session.endSession(); }
}
export async function deleteAccount({ id, role }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await resolveUser(id, role, session);
      const profile = await DealerProfile.findOne({ userId: user._id }).session(session);
      if (profile) {
        await DealerPricing.deleteMany({ dealerId: profile._id }, { session });
        await DealerProfile.deleteOne({ _id: profile._id }, { session });
      }
      await Session.deleteMany({ userId: user._id }, { session });
      await Cart.deleteMany({ userId: user._id }, { session });
      await PushDevice.deleteMany({ userId: user._id }, { session });
      await OtpVerification.deleteMany({ identifier: { $in: [user.email, user.phone].filter(Boolean) } }, { session });
      // Enquiries and POS sales retain their original billing snapshots.
      await User.deleteOne({ _id: user._id, role }, { session });
    });
  } finally { await session.endSession(); }
}
const documentTypes = ['gst', 'aadhaar', 'msme', 'pan'];
const enrollmentUpload = uploadFields(documentTypes.map(name => ({ name, maxCount: 1 })), 'kyc');
const parseEnrollment = converting => (req, res, next) => {
  try {
    if (Object.keys(req.body || {}).some(key => key !== 'details')) throw new AppError('Submit dealer details and document files.', 400, 'VALIDATION_ERROR');
    let details;
    try { details = JSON.parse(req.body?.details || '{}'); } catch { throw new AppError('Invalid dealer details.', 400, 'VALIDATION_ERROR'); }
    req.body = (converting ? dealerBusinessBody : dealerEnrollmentBody).parse(details);
    next();
  } catch (error) { next(error); }
};
const enrollDealer = converting => asyncHandler(async (req, res) => {
  const documents = [];
  let user;
  try {
    for (const type of documentTypes) {
      const file = req.files?.[type]?.[0];
      if (!file) continue;
      const uploaded = await storageService.uploadFile({ ...file, category: 'kyc', folder: 'vinexus/kyc/admin' });
      documents.push({ type, url: uploaded.url, publicId: uploaded.publicId, uploadedAt: new Date() });
    }
    user = await saveAccount({ id: converting ? req.params.id : undefined, role: 'dealer', data: req.body, actorId: req.user._id, converting, documents });
  } catch (error) {
    await Promise.allSettled(documents.filter(doc => doc.publicId).map(doc => storageService.deleteFile(doc.publicId)));
    throw error;
  }
  ApiResponse.success(res, converting ? 'Customer converted to an approved dealer.' : 'Dealer created and approved.', { user }, converting ? 200 : 201);
});
export function mountAccountCrud(router, role) {
  if (role === 'dealer') {
    router.post('/', superAdminAccountsOnly, enrollmentUpload, parseEnrollment(false), enrollDealer(false));
  } else {
    router.post('/', superAdminAccountsOnly, validate({ body: accountBody(role) }), asyncHandler(async (req, res) => {
      const user = await saveAccount({ role, data: req.body, actorId: req.user._id });
      ApiResponse.success(res, 'Customer created.', { user }, 201);
    }));
    router.post('/:id/convert-to-dealer', superAdminAccountsOnly, validate({ params: idParams }), enrollmentUpload, parseEnrollment(true), enrollDealer(true));
  }
  router.put('/:id', superAdminAccountsOnly, validate({ params: idParams, body: accountBody(role) }), asyncHandler(async (req, res) => {
    const user = await saveAccount({ id: req.params.id, role, data: req.body, actorId: req.user._id });
    ApiResponse.success(res, 'Account updated.', { user });
  }));
  router.delete('/:id', superAdminAccountsOnly, validate({ params: idParams }), asyncHandler(async (req, res) => {
    await deleteAccount({ id: req.params.id, role });
    ApiResponse.success(res, 'Account deleted. Historical enquiries and invoices retained.');
  }));
}
