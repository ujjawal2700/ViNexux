import { verifyAccessToken } from '../utils/token.util.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { isSessionExpired } from '../utils/session.util.js';

const LAST_ACTIVE_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header (Bearer <JWT_ACCESS_TOKEN>)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new AppError(
        'Authentication required. Please provide a valid Bearer access token.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Verify JWT access token signature & expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      throw new AppError(
        'Invalid or expired access token. Please log in or refresh your token.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const { userId, sessionId } = decoded;
    if (!userId || !sessionId) {
      throw new AppError(
        'Invalid token payload structure.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Session and user lookups are independent; run them together.
    const [session, user] = await Promise.all([
      Session.findOne({ sessionId, isActive: true }),
      User.findById(userId),
    ]);
    if (!session) {
      throw new AppError(
        'Session is inactive or has been revoked.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (isSessionExpired(session)) {
      session.isActive = false;
      await session.save();
      throw new AppError(
        'Session expired. Please log in again.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check account status
    if (!user || user.accountStatus === 'blocked' || user.status === 'blocked') {
      throw new AppError(
        'User account is blocked or no longer exists.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Update session lastActiveAt at most every few minutes rather than
    // writing to the database on every authenticated request.
    const now = new Date();
    if (!session.lastActiveAt || now - session.lastActiveAt > LAST_ACTIVE_WRITE_INTERVAL_MS) {
      session.lastActiveAt = now;
      await Session.updateOne({ _id: session._id }, { $set: { lastActiveAt: now } });
    }

    // Attach user and session to request object
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Reusable role-based authorization middleware.
 * @param  {...string} allowedRoles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError(
        'Authentication required.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        'Access forbidden. You do not have sufficient permissions to perform this operation.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    next();
  };
};

// Guests may browse; supplied credentials must still be valid.
export const optionalAuthenticate = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
};
