import mongoose from 'mongoose';
import { DealerProfile } from '../models/DealerProfile.js';
import { User } from '../models/User.js';
import { storageService } from './storage/storage.service.js';
import { AppError } from '../utils/AppError.js';
import { dealerApplicationSchema } from '../validators/dealer.validator.js';

const conflict = () => new AppError('This application is already under review. Wait for a decision before changing it.', 409, 'CONFLICT');
export const getApplication = userId => DealerProfile.findOne({ userId }).lean();
export const saveApplication = async (userId, details) => {
  let profile;
  await mongoose.connection.transaction(async session => {
    const user = await User.findOne({ _id: userId, role: 'customer', accountStatus: { $ne: 'blocked' }, status: { $ne: 'blocked' } }).session(session);
    if (!user) throw new AppError('An active customer account is required.', 403, 'FORBIDDEN');
    profile = await DealerProfile.findOne({ userId }).session(session);
    if (profile && (profile.applicationSource !== 'customer' || profile.status === 'approved' || (profile.applicationState === 'submitted' && profile.status === 'pending'))) throw conflict();
    for (const key of ['gstin', 'pan']) {
      if (await DealerProfile.exists({ [key]: details[key], userId: { $ne: userId } }).session(session)) throw new AppError(`This ${key.toUpperCase()} is already registered to another dealer.`, 409, 'CONFLICT');
    }
    if (!profile) profile = new DealerProfile({ userId, ...details, applicationSource: 'customer', applicationState: 'draft', status: 'pending' });
    else Object.assign(profile, details, { applicationState: 'draft', status: 'pending', rejectionReason: undefined });
    await profile.save({ session });
    user.dealerProfileId = profile._id;
    await user.save({ session });
  });
  return getApplication(userId);
};

export const uploadApplicationDocument = async (userId, type, file) => {
  if (!['gst', 'aadhaar', 'msme'].includes(type)) throw new AppError('Choose GST, Aadhaar or MSME document.', 400, 'VALIDATION_ERROR');
  const profile = await DealerProfile.findOne({ userId, applicationSource: 'customer', applicationState: 'draft', status: 'pending' }).lean();
  if (!profile) throw conflict();
  const uploaded = await storageService.uploadFile({ buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype,
    folder: `vinexus/kyc/${profile._id}`, category: 'kyc' });
  const document = { type, url: uploaded.url, publicId: uploaded.publicId, uploadedAt: new Date() };
  try {
    // Compare the document version so concurrent uploads cannot overwrite each
    // other or alter an application after it has been submitted or approved.
    const documents = [...(profile.kycDocuments || []).filter(doc => doc.type !== type), document];
    const saved = await DealerProfile.findOneAndUpdate({ _id: profile._id, applicationState: 'draft', status: 'pending', __v: profile.__v },
      { $set: { kycDocuments: documents }, $inc: { __v: 1 } }, { new: true, runValidators: true }).lean();
    if (!saved) throw conflict();
    return saved;
  } catch (error) {
    if (uploaded.publicId) await storageService.deleteFile(uploaded.publicId).catch(() => {});
    throw error;
  }
};

export const submitApplication = async userId => {
  let profile;
  await mongoose.connection.transaction(async session => {
    const user = await User.findOne({ _id: userId, role: 'customer' }).session(session);
    if (!user) throw new AppError('A customer account is required.', 403, 'FORBIDDEN');
    profile = await DealerProfile.findOne({ userId, applicationSource: 'customer', applicationState: 'draft', status: 'pending' }).select('+aadhaarNumber').session(session);
    if (!profile) throw conflict();
    const data = profile.toObject();
    dealerApplicationSchema.body.parse(Object.fromEntries(Object.keys(dealerApplicationSchema.body.shape).map(key => [key, data[key]])));
    if (!['gst', 'aadhaar'].every(type => profile.kycDocuments.some(doc => doc.type === type && doc.url))) throw new AppError('Upload your GST certificate and Aadhaar card before submitting.', 400, 'VALIDATION_ERROR');
    profile.applicationState = 'submitted';
    await profile.save({ session });
  });
  return getApplication(userId);
};
