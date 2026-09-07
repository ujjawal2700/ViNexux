import mongoose from 'mongoose';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Admin: List sessions with pagination, filtering & search
 */
export const listSessions = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    userId,
    userType,
    role,
    isActive,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  const targetRole = userType || role;
  if (targetRole) {
    filter.userType = targetRole;
  }

  if (isActive !== undefined && typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  const now = new Date();
  if (status === 'active') {
    filter.isActive = true;
    filter.expiresAt = { $gt: now };
  } else if (status === 'expired') {
    filter.expiresAt = { $lte: now };
  } else if (status === 'revoked') {
    filter.isActive = false;
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    const matchingUsers = await User.find({
      $or: [
        { fullName: new RegExp(safeSearch, 'i') },
        { name: new RegExp(safeSearch, 'i') },
        { email: new RegExp(safeSearch, 'i') },
        { phone: new RegExp(safeSearch, 'i') },
      ],
    }).select('_id').lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);
    const searchConditions = [
      { sessionId: new RegExp(safeSearch, 'i') },
      { ipAddress: new RegExp(safeSearch, 'i') },
    ];

    if (matchingUserIds.length > 0) {
      searchConditions.push({ userId: { $in: matchingUserIds } });
    }

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  const skip = (page - 1) * limit;

  const totalItems = await Session.countDocuments(filter);
  const sessions = await Session.find(filter)
    .populate('userId', 'fullName name email phone role accountStatus isPhoneVerified isEmailVerified')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    sessions,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Admin: Get session detail by MongoDB ObjectId or UUID sessionId
 */
export const getSessionById = async (id) => {
  let session;
  if (mongoose.Types.ObjectId.isValid(id)) {
    session = await Session.findById(id).populate(
      'userId',
      'fullName name email phone role accountStatus isPhoneVerified isEmailVerified'
    );
  }

  if (!session) {
    session = await Session.findOne({ sessionId: id }).populate(
      'userId',
      'fullName name email phone role accountStatus isPhoneVerified isEmailVerified'
    );
  }

  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return session;
};

/**
 * Admin: Revoke/terminate session by MongoDB ObjectId or UUID sessionId
 */
export const revokeSession = async (id) => {
  let session;
  if (mongoose.Types.ObjectId.isValid(id)) {
    session = await Session.findById(id);
  }
  if (!session) {
    session = await Session.findOne({ sessionId: id });
  }

  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  session.isActive = false;
  session.revokedAt = new Date();
  await session.save();

  // Clear currentSessionId on user if this session was active for user
  const user = await User.findById(session.userId);
  if (user && user.currentSessionId === session.sessionId) {
    user.currentSessionId = null;
    await user.save();
  }

  return await Session.findById(session._id).populate(
    'userId',
    'fullName name email phone role accountStatus isPhoneVerified isEmailVerified'
  );
};
