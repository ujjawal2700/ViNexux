import { verifyAccessToken } from '../utils/token.util.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

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

    // Find active session in MongoDB
    const session = await Session.findOne({ sessionId, isActive: true });
    if (!session) {
      throw new AppError(
        'Session is inactive or has been revoked.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      session.isActive = false;
      await session.save();
      throw new AppError(
        'Session expired. Please log in again.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Fetch user and check account status
    const user = await User.findById(userId);
    if (!user || user.accountStatus === 'blocked' || user.status === 'blocked') {
      throw new AppError(
        'User account is blocked or no longer exists.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Update session lastActiveAt (timestamp tracking)
    session.lastActiveAt = new Date();
    await session.save();

    // Attach user and session to request object
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};
