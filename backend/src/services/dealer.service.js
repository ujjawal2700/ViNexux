import { DealerProfile } from '../models/DealerProfile.js';
import { User } from '../models/User.js';
import { storageService } from './storage/storage.service.js';
import { whatsAppService } from './whatsapp/whatsapp.service.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Create dealer profile for authenticated dealer user
 */
export const createDealerProfile = async (userId, profileData) => {
  // 1. Ensure user exists and is a dealer
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (user.role !== 'dealer') {
    throw new AppError(
      'Only users registered with dealer role can create a dealer profile',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN
    );
  }

  // 2. Prevent duplicate profile creation for same user
  const existingProfile = await DealerProfile.findOne({ userId });
  if (existingProfile) {
    throw new AppError(
      'Dealer profile already exists for this account',
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.CONFLICT
    );
  }

  // 3. Ensure GSTIN uniqueness if provided
  if (profileData.gstin) {
    const gstinMatch = await DealerProfile.findOne({ gstin: profileData.gstin });
    if (gstinMatch) {
      throw new AppError(
        'GSTIN is already registered to another dealer profile',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }
  }

  // 4. Ensure PAN uniqueness if provided
  if (profileData.pan) {
    const panMatch = await DealerProfile.findOne({ pan: profileData.pan });
    if (panMatch) {
      throw new AppError(
        'PAN is already registered to another dealer profile',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }
  }

  // 5. Create dealer profile with initial status 'pending'
  const profile = await DealerProfile.create({
    ...profileData,
    userId,
    status: 'pending',
  });

  // 6. Keep User.dealerProfileId synchronized
  user.dealerProfileId = profile._id;
  await user.save();

  return await profile.populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified');
};

/**
 * Get dealer profile for authenticated user
 */
export const getDealerProfileByUserId = async (userId) => {
  const profile = await DealerProfile.findOne({ userId }).populate(
    'userId',
    'fullName email phone role accountStatus isPhoneVerified isEmailVerified'
  );

  if (!profile) {
    throw new AppError(
      'Dealer profile not found for this account. Please create a profile first.',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  return profile;
};

/**
 * Update dealer profile for authenticated user
 */
export const updateDealerProfileByUserId = async (userId, updateData) => {
  const profile = await DealerProfile.findOne({ userId });
  if (!profile) {
    throw new AppError(
      'Dealer profile not found for this account',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  // Check GSTIN uniqueness if provided, non-empty, and changed
  if (
    updateData.gstin !== undefined &&
    updateData.gstin !== null &&
    updateData.gstin !== '' &&
    updateData.gstin !== profile.gstin
  ) {
    const gstinMatch = await DealerProfile.findOne({
      gstin: updateData.gstin,
      _id: { $ne: profile._id },
    });
    if (gstinMatch) {
      throw new AppError(
        'GSTIN is already registered to another dealer profile',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }
  }

  // Check PAN uniqueness if provided, non-empty, and changed
  if (
    updateData.pan !== undefined &&
    updateData.pan !== null &&
    updateData.pan !== '' &&
    updateData.pan !== profile.pan
  ) {
    const panMatch = await DealerProfile.findOne({
      pan: updateData.pan,
      _id: { $ne: profile._id },
    });
    if (panMatch) {
      throw new AppError(
        'PAN is already registered to another dealer profile',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }
  }

  // Detect critical KYC changes (GSTIN change/clearing, PAN change/clearing, kycDocuments update/clearing)
  const currentGstin = profile.gstin || '';
  const newGstin = updateData.gstin !== undefined ? updateData.gstin || '' : undefined;
  const isGstinChanged = newGstin !== undefined && newGstin !== currentGstin;

  const currentPan = profile.pan || '';
  const newPan = updateData.pan !== undefined ? updateData.pan || '' : undefined;
  const isPanChanged = newPan !== undefined && newPan !== currentPan;

  const isKycDocsChanged = updateData.kycDocuments !== undefined;

  const isUpdatingCriticalKyc = isGstinChanged || isPanChanged || isKycDocsChanged;

  // Status transition logic:
  // 1. If currently rejected, any resubmission resets status to 'pending' and clears rejectionReason.
  // 2. If currently approved and critical KYC info changes/clears, reset status to 'pending' and clear rejectionReason.
  if (profile.status === 'rejected') {
    profile.status = 'pending';
    profile.rejectionReason = undefined;
  } else if (profile.status === 'approved' && isUpdatingCriticalKyc) {
    profile.status = 'pending';
    profile.rejectionReason = undefined;
  }

  // Apply update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      profile[key] = updateData[key];
    }
  });

  await profile.save();

  return await profile.populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified');
};

/**
 * List all dealer profiles (Admin only)
 */
export const listDealers = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    city,
    state,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (city) {
    filter.city = new RegExp(escapeRegex(city), 'i');
  }

  if (state) {
    filter.state = new RegExp(escapeRegex(state), 'i');
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { companyName: new RegExp(safeSearch, 'i') },
      { gstin: new RegExp(safeSearch, 'i') },
      { pan: new RegExp(safeSearch, 'i') },
    ];
  }

  const skip = (page - 1) * limit;

  const totalItems = await DealerProfile.countDocuments(filter);
  const dealers = await DealerProfile.find(filter)
    .populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified')
    .populate('kycReviewedBy', 'fullName email role')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    dealers,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Get single dealer profile by ID (Admin only)
 */
export const getDealerById = async (dealerId) => {
  const profile = await DealerProfile.findById(dealerId)
    .populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified')
    .populate('kycReviewedBy', 'fullName email role');

  if (!profile) {
    throw new AppError('Dealer profile not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return profile;
};

/**
 * Approve dealer KYC (Admin only)
 */
export const approveDealerKyc = async (dealerId, adminId = null) => {
  const profile = await DealerProfile.findById(dealerId);

  if (!profile) {
    throw new AppError('Dealer profile not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  profile.status = 'approved';
  profile.rejectionReason = undefined;
  if (adminId) {
    profile.kycReviewedBy = adminId;
    profile.kycReviewedAt = new Date();
    profile.kycReviewAction = 'approved';
  }
  await profile.save();

  // Sync user status to active if user exists
  await User.findByIdAndUpdate(profile.userId, {
    accountStatus: 'active',
    status: 'active',
  });

  const updatedProfile = await profile.populate([
    { path: 'userId', select: 'fullName email phone role accountStatus isPhoneVerified isEmailVerified' },
    { path: 'kycReviewedBy', select: 'fullName email role' },
  ]);

  // Attempt WhatsApp notification (Isolated operation; does not throw if fails)
  try {
    await whatsAppService.sendDealerKycApprovedNotification(updatedProfile);
  } catch (err) {
    console.error('[DealerService] WhatsApp KYC approved notification failed silently:', err.message);
  }

  return updatedProfile;
};

/**
 * Reject dealer KYC (Admin only)
 */
export const rejectDealerKyc = async (dealerId, rejectionReason, adminId = null) => {
  const profile = await DealerProfile.findById(dealerId);

  if (!profile) {
    throw new AppError('Dealer profile not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  profile.status = 'rejected';
  profile.rejectionReason = rejectionReason && rejectionReason.trim() ? rejectionReason.trim() : undefined;
  if (adminId) {
    profile.kycReviewedBy = adminId;
    profile.kycReviewedAt = new Date();
    profile.kycReviewAction = 'rejected';
  }
  await profile.save();

  const updatedProfile = await profile.populate([
    { path: 'userId', select: 'fullName email phone role accountStatus isPhoneVerified isEmailVerified' },
    { path: 'kycReviewedBy', select: 'fullName email role' },
  ]);

  // Attempt WhatsApp notification (Isolated operation; does not throw if fails)
  try {
    await whatsAppService.sendDealerKycRejectedNotification(updatedProfile, profile.rejectionReason);
  } catch (err) {
    console.error('[DealerService] WhatsApp KYC rejected notification failed silently:', err.message);
  }

  return updatedProfile;
};


/**
 * Revoke approved dealer status (Admin only)
 * Reverts dealer status to 'rejected' / non-approved so pricing falls back to standardPrice.
 * Preserves User.accountStatus = 'active' and keeps DealerPricing records intact.
 */
export const revokeDealerStatus = async (dealerId, reason, adminId = null) => {
  const profile = await DealerProfile.findById(dealerId);

  if (!profile) {
    throw new AppError('Dealer profile not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  profile.status = 'rejected';
  profile.rejectionReason = reason && reason.trim() ? reason.trim() : 'Dealer status revoked by admin';
  if (adminId) {
    profile.kycReviewedBy = adminId;
    profile.kycReviewedAt = new Date();
    profile.kycReviewAction = 'revoked';
  }
  await profile.save();

  return await profile.populate([
    { path: 'userId', select: 'fullName email phone role accountStatus isPhoneVerified isEmailVerified' },
    { path: 'kycReviewedBy', select: 'fullName email role' },
  ]);
};

/**
 * Upload or replace a KYC document for authenticated dealer
 */
export const uploadKycDocument = async (userId, { type, file }) => {
  const allowedTypes = ['gst', 'pan', 'aadhaar'];
  if (!allowedTypes.includes(type)) {
    throw new AppError(
      `Invalid KYC document type '${type}'. Allowed types: ${allowedTypes.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const profile = await DealerProfile.findOne({ userId });
  if (!profile) {
    throw new AppError('Dealer profile not found for this account. Please create a dealer profile first.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const existingDocIndex = (profile.kycDocuments || []).findIndex((doc) => doc.type === type);
  let oldPublicId = null;
  if (existingDocIndex >= 0) {
    oldPublicId = profile.kycDocuments[existingDocIndex].publicId;
  }

  const folder = `vinexus/kyc/${profile._id}`;
  const uploaded = await storageService.replaceFile({
    oldPublicId,
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder,
    category: 'kyc',
  });

  const docData = {
    type,
    url: uploaded.url,
    publicId: uploaded.publicId,
    uploadedAt: new Date(),
  };

  if (existingDocIndex >= 0) {
    profile.kycDocuments[existingDocIndex] = docData;
  } else {
    if (!Array.isArray(profile.kycDocuments)) {
      profile.kycDocuments = [];
    }
    profile.kycDocuments.push(docData);
  }

  if (profile.status === 'rejected' || profile.status === 'approved') {
    profile.status = 'pending';
    profile.rejectionReason = undefined;
  }

  await profile.save();
  return await profile.populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified');
};

/**
 * Delete a KYC document from profile and storage for authenticated dealer
 */
export const deleteKycDocument = async (userId, type) => {
  const profile = await DealerProfile.findOne({ userId });
  if (!profile) {
    throw new AppError('Dealer profile not found for this account', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const existingDocIndex = (profile.kycDocuments || []).findIndex((doc) => doc.type === type);
  if (existingDocIndex === -1) {
    throw new AppError(`KYC document of type '${type}' not found on dealer profile`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const docToDelete = profile.kycDocuments[existingDocIndex];
  if (docToDelete.publicId) {
    await storageService.deleteFile(docToDelete.publicId);
  }

  profile.kycDocuments.splice(existingDocIndex, 1);

  if (profile.status === 'approved' || profile.status === 'rejected') {
    profile.status = 'pending';
    profile.rejectionReason = undefined;
  }

  await profile.save();
  return await profile.populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified');
};

