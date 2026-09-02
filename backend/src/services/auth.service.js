import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { OtpVerification } from '../models/OtpVerification.js';
import { Session } from '../models/Session.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { getOtpProvider } from '../integrations/otp/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generateConflictTicket,
  verifyConflictTicket,
} from '../utils/token.util.js';

const normalizeIdentifier = (identifier) => {
  if (!identifier) return '';
  const trimmed = identifier.trim();
  return trimmed.includes('@') ? trimmed.toLowerCase() : trimmed;
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const generateOtp = () => {
  if (config.nodeEnv === 'development' && config.devOtp) {
    return config.devOtp;
  }
  return crypto.randomInt(100000, 999999).toString();
};

export const authService = {
  /**
   * Registers a new user account (Customer or Dealer) with password hashing.
   * Account status remains 'pending' until phone OTP verification.
   */
  async signup({ fullName, email, phone, password, role = 'customer' }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // Check for duplicate registered email or phone
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new AppError('An account with this email address already exists.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create pending unverified user
    const user = await User.create({
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: role === 'dealer' ? 'dealer' : 'customer',
      isPhoneVerified: false,
      isEmailVerified: false,
      accountStatus: 'pending',
      status: 'pending',
    });

    // Automatically send signup OTP to phone number
    const otpResult = await this.sendOtp({
      identifier: normalizedPhone,
      purpose: 'signup',
    });

    return {
      message: 'Signup successful. Please verify your phone number via OTP.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        accountStatus: user.accountStatus,
      },
      devOtp: otpResult.devOtp,
    };
  },

  /**
   * Generates and dispatches an OTP for signup, login, or phone-change.
   */
  async sendOtp({ identifier, purpose = 'login' }) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) {
      throw new AppError('Identifier is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    // For login purpose: ensure user exists
    if (purpose === 'login') {
      const isEmail = normalized.includes('@');
      const user = await User.findOne(isEmail ? { email: normalized } : { phone: normalized });
      if (!user) {
        throw new AppError(
          'No registered user account found with this email or phone number. Please signup first.',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.NOT_FOUND
        );
      }
      if (user.accountStatus === 'blocked' || user.status === 'blocked') {
        throw new AppError(
          'Your account has been blocked. Please contact support.',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    await OtpVerification.findOneAndUpdate(
      { identifier: normalized, purpose },
      {
        identifier: normalized,
        purpose,
        otpHash,
        expiresAt,
        attempts: 0,
        isVerified: false,
      },
      { upsert: true, new: true, runValidators: true }
    );

    const provider = getOtpProvider();
    const dispatchResult = await provider.sendOtp({
      identifier: normalized,
      otp,
      purpose,
    });

    return {
      identifier: normalized,
      purpose,
      expiresAt,
      devOtp: dispatchResult.devOtp,
    };
  },

  /**
   * Verifies OTP. Handles session creation or single active session conflict.
   */
  async verifyOtp({ identifier, otp, purpose = 'login', reqInfo }) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized || !otp) {
      throw new AppError('Identifier and OTP are required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const otpRecord = await OtpVerification.findOne({ identifier: normalized, purpose });
    if (!otpRecord || otpRecord.isVerified) {
      throw new AppError(
        'No pending OTP request found for this identifier. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new AppError(
        'OTP has expired. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (otpRecord.attempts >= config.otpMaxAttempts) {
      throw new AppError(
        'Maximum verification attempts exceeded. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const computedHash = hashOtp(otp);
    if (otpRecord.otpHash !== computedHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new AppError(
        'Invalid OTP. Please check and try again.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    // Retrieve User
    const isEmail = normalized.includes('@');
    const user = await User.findOne(isEmail ? { email: normalized } : { phone: normalized });

    if (!user) {
      throw new AppError('User not found. Please signup first.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    if (user.accountStatus === 'blocked' || user.status === 'blocked') {
      throw new AppError('Your account has been blocked. Please contact support.', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Activate user upon successful phone verification
    if (purpose === 'signup' || user.accountStatus === 'pending') {
      user.isPhoneVerified = true;
      user.accountStatus = 'active';
      user.status = 'active';
      await user.save();
    }

    // Check for existing active session (Single Active Session Enforcement)
    const existingSession = await Session.findOne({ userId: user._id, isActive: true });

    if (existingSession && existingSession.expiresAt > new Date()) {
      // Session conflict detected! Generate a secure short-lived conflict ticket bound to existingSessionId
      const conflictTicket = generateConflictTicket({
        userId: user._id,
        existingSessionId: existingSession.sessionId,
      });

      return {
        sessionConflict: true,
        conflictTicket,
        userId: user._id,
        existingSession: {
          deviceInfo: existingSession.deviceInfo,
          lastActiveAt: existingSession.lastActiveAt,
        },
      };
    }

    // No existing active session -> create brand new session & issue tokens
    return await this.createSessionAndIssueTokens(user, reqInfo);
  },

  /**
   * Helper to create session and issue Access Token + Refresh Token.
   */
  async createSessionAndIssueTokens(user, reqInfo) {
    const sessionId = crypto.randomUUID();
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const sessionExpiresAt = new Date(Date.now() + config.jwtRefreshExpiryDays * 24 * 60 * 60 * 1000);

    const session = await Session.create({
      userId: user._id,
      userType: user.role,
      sessionId,
      refreshTokenHash,
      deviceInfo: reqInfo?.deviceInfo || {},
      ipAddress: reqInfo?.ipAddress || '127.0.0.1',
      isActive: true,
      issuedAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: sessionExpiresAt,
    });

    // Update user's currentSessionId
    user.currentSessionId = sessionId;
    await user.save();

    const accessToken = generateAccessToken({
      userId: user._id,
      sessionId: session.sessionId,
      role: user.role,
    });

    return {
      sessionConflict: false,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        accountStatus: user.accountStatus,
      },
      session: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
      },
    };
  },

  /**
   * Force login when user confirms session conflict popup.
   * Validates conflict ticket, revokes existing conflicting session, and creates new session.
   */
  async forceLogin({ conflictTicket, reqInfo }) {
    let decoded;
    try {
      decoded = verifyConflictTicket(conflictTicket);
    } catch (err) {
      throw new AppError('Invalid or expired conflict ticket. Please log in again.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.accountStatus === 'blocked' || user.status === 'blocked') {
      throw new AppError('Account not active or authorized.', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Verify the specific conflicting session is still active
    if (decoded.existingSessionId) {
      const targetSession = await Session.findOne({
        sessionId: decoded.existingSessionId,
        userId: user._id,
        isActive: true,
      });

      if (!targetSession) {
        throw new AppError(
          'The conflicting session has already been resolved, expired, or revoked.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
    }

    // Revoke all existing active sessions for this user
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );

    // Create new session and issue new tokens
    return await this.createSessionAndIssueTokens(user, reqInfo);
  },

  /**
   * Refreshes access token and rotates refresh token.
   */
  async refreshToken({ refreshToken }) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    const incomingHash = hashToken(refreshToken);

    // Find active, non-expired session matching refresh token hash
    const session = await Session.findOne({
      refreshTokenHash: incomingHash,
      isActive: true,
    }).select('+refreshTokenHash');

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        session.isActive = false;
        await session.save();
      }
      throw new AppError(
        'Invalid, expired, or revoked refresh token. Please log in again.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const user = await User.findById(session.userId);
    if (!user || user.accountStatus === 'blocked' || user.status === 'blocked') {
      session.isActive = false;
      await session.save();
      throw new AppError('User account is blocked or no longer exists.', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Refresh Token Rotation: generate new refresh token and update hash
    const newRefreshToken = generateRefreshToken();
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.lastActiveAt = new Date();
    await session.save();

    // Issue new JWT access token
    const accessToken = generateAccessToken({
      userId: user._id,
      sessionId: session.sessionId,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  },

  /**
   * Revokes active session and clears user's currentSessionId.
   */
  async logout({ userId, sessionId }) {
    if (!sessionId) {
      throw new AppError('Session ID is required for logout', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    await Session.findOneAndUpdate(
      { sessionId, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );

    const user = await User.findById(userId);
    if (user && user.currentSessionId === sessionId) {
      user.currentSessionId = null;
      await user.save();
    }

    return { message: 'Logged out successfully' };
  },

  /**
   * Retrieves authenticated user details.
   */
  async getCurrentUser({ userId, sessionId }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    return {
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
      sessionId,
    };
  },
};

export default authService;
