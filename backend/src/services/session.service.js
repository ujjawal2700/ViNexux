import { auditContext } from '../audit/audit.js';
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
export const listSessions = async (query = {}, currentSessionId = null) => {
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

  if (auditContext.getStore()?.actor?.isEmployee) {
    if (targetRole === 'admin') throw new AppError('Administrator sessions are restricted to super admins.', 403, ERROR_CODES.FORBIDDEN);
    filter.userType = targetRole || { $ne: 'admin' };
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
      { userAgent: new RegExp(safeSearch, 'i') },
      { device: new RegExp(safeSearch, 'i') },
      { browser: new RegExp(safeSearch, 'i') },
      { os: new RegExp(safeSearch, 'i') },
    ];

    if (mongoose.Types.ObjectId.isValid(search.trim())) {
      searchConditions.push({ _id: search.trim() });
    }

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

  const totalItems = await Session.countDocuments(filter);
  // Pin only the requesting browser's authenticated session, within the selected filters.
  const current = currentSessionId ? await Session.findOne({ ...filter, sessionId: currentSessionId })
    .populate('userId', 'fullName name email phone role accountStatus isPhoneVerified isEmailVerified').lean() : null;
  const remainingFilter = current ? { $and: [filter, { _id: { $ne: current._id } }] } : filter;
  const skip = Math.max(0, (page - 1) * limit - (current && page > 1 ? 1 : 0));
  const rows = await Session.find(remainingFilter)
    .populate('userId', 'fullName name email phone role accountStatus isPhoneVerified isEmailVerified')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
    .skip(skip)
    .limit(current && page === 1 ? Math.max(1, limit - 1) : limit)
    .lean();
  const sessions = [...(current && page === 1 ? [current] : []), ...(current && page === 1 && limit === 1 ? [] : rows)]
    .map(session => ({ ...session, isCurrent: session.sessionId === currentSessionId }));

  return {
    sessions,
    pagination: {
      total: totalItems,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      page,
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

  if (session?.userType === 'admin' && auditContext.getStore()?.actor?.isEmployee) {
    throw new AppError('Administrator sessions are restricted to super admins.', 403, ERROR_CODES.FORBIDDEN);
  }

  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return session;
};

/**
 * Admin: Revoke/terminate session by MongoDB ObjectId or UUID sessionId
 */
export const revokeSession = async (id, currentSessionId = null) => {
  let session;
  if (mongoose.Types.ObjectId.isValid(id)) {
    session = await Session.findById(id);
  }
  if (!session) {
    session = await Session.findOne({ sessionId: id });
  }

  if (session?.userType === 'admin' && auditContext.getStore()?.actor?.isEmployee) {
    throw new AppError('Administrator sessions are restricted to super admins.', 403, ERROR_CODES.FORBIDDEN);
  }

  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (session.sessionId === currentSessionId) {
    throw new AppError('This is your current session. Use Log out to end it.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
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

/**
 * Admin: Delete revoked or expired session from audit directory
 * Note: Active sessions cannot be deleted.
 */
export const deleteSession = async (id) => {
  let session;
  if (mongoose.Types.ObjectId.isValid(id)) {
    session = await Session.findById(id);
  }
  if (!session) {
    session = await Session.findOne({ sessionId: id });
  }

  if (session?.userType === 'admin' && auditContext.getStore()?.actor?.isEmployee) {
    throw new AppError('Administrator sessions are restricted to super admins.', 403, ERROR_CODES.FORBIDDEN);
  }

  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const isSessionActive = session.isActive && new Date(session.expiresAt) > new Date();
  if (isSessionActive) {
    throw new AppError(
      'Cannot delete an active session. Please revoke the session first before deleting.',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }

  await Session.deleteOne({ _id: session._id });

  return {
    deletedSessionId: session.sessionId,
    id: session._id,
  };
};
