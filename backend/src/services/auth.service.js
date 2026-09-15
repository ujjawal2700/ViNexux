import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
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
  generatePasswordResetTicket,
  verifyPasswordResetTicket,
} from '../utils/token.util.js';

import { normalizePhoneNumber } from '../utils/phone.util.js';
import { emailService } from './email/email.service.js';

const normalizeIdentifier = (identifier) => {
  if (!identifier) return '';
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const normalizedPhone = normalizePhoneNumber(trimmed);
  return normalizedPhone || trimmed;
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const generateOtp = () => {
  if (config.demoMode && config.devOtp) {
    return config.devOtp;
  }
  return crypto.randomInt(100000, 999999).toString();
};

export const authService = {
  /**
   * Registers a new user account (Customer or Dealer) with password hashing.
   * Account status remains 'pending' until phone OTP verification.
   */
  async signup({
    fullName,
    email,
    phone,
    password,
    dob,
    role = 'customer',
    companyName,
    gstin,
    pan,
    aadhaarNumber,
    address,
    city,
    state,
    pincode,
    reqInfo,
  }) {
    if (role === 'admin') {
      throw new AppError('This is Not Admin Portal', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone ? phone.trim() : '';
    const isDealer = role === 'dealer';

    // Require OTP-verified contact before creating the account: customers
    // verify their email, dealers verify their phone (see verifySignupOtp).
    const otpIdentifier = isDealer ? normalizedPhone : normalizedEmail;
    const normalizedOtpIdentifier = normalizeIdentifier(otpIdentifier);
    const verifiedOtp = await OtpVerification.findOne({
      identifier: normalizedOtpIdentifier,
      purpose: 'signup',
      isVerified: true,
    });
    if (!verifiedOtp) {
      throw new AppError(
        isDealer
          ? 'Please verify your phone number via OTP before completing registration.'
          : 'Please verify your email address via OTP before completing registration.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
    // Consumed only once account creation actually succeeds below (not here) -
    // so a duplicate-email/phone rejection doesn't burn a valid verified OTP.

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check for duplicate registered email
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.role === 'admin') {
        throw new AppError('This is Not Admin Portal', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      }

      if (isDealer) {
        const existingDealerProfile = await DealerProfile.findOne({ userId: user._id });
        if (existingDealerProfile) {
          throw new AppError(
            'A Dealer account with this email address already exists. Please Sign In.',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.BAD_REQUEST
          );
        }

        // Upgrade existing Customer/User account to Dealer role & create DealerProfile
        user.role = 'dealer';
        user.fullName = fullName.trim();
        user.name = fullName.trim();
        if (normalizedPhone) user.phone = normalizedPhone;
        if (dob) user.dob = new Date(dob);
        user.passwordHash = passwordHash;

        const dealerProfile = await DealerProfile.create({
          userId: user._id,
          companyName: companyName ? companyName.trim() : `${fullName.trim()} Enterprise`,
          gstin: gstin ? gstin.trim().toUpperCase() : undefined,
          pan: pan ? pan.trim().toUpperCase() : undefined,
          aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : undefined,
          address: address ? address.trim() : undefined,
          city: city ? city.trim() : undefined,
          state: state ? state.trim() : undefined,
          pincode: pincode ? pincode.trim() : undefined,
          status: 'pending',
        });

        user.dealerProfileId = dealerProfile._id;
        await user.save();
        await OtpVerification.deleteOne({ _id: verifiedOtp._id });

        const sessionData = await this.createSessionAndIssueTokens(user, reqInfo);
        return {
          message: 'Dealer registration submitted! Your account status is Pending Review. Admin has been notified for approval.',
          ...sessionData,
        };
      } else {
        throw new AppError(
          'An account with this email address already exists.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
    }

    // Check if phone number is taken by another account
    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        throw new AppError(
          'An account with this phone number already exists.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
    }

    // Create new user account
    user = await User.create({
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      dob: dob ? new Date(dob) : undefined,
      passwordHash,
      role: isDealer ? 'dealer' : 'customer',
      isPhoneVerified: true,
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    let dealerProfile = null;

    // If registering as a Dealer, create DealerProfile with 'pending' status
    if (isDealer) {
      dealerProfile = await DealerProfile.create({
        userId: user._id,
        companyName: companyName ? companyName.trim() : `${fullName.trim()} Enterprise`,
        gstin: gstin ? gstin.trim().toUpperCase() : undefined,
        pan: pan ? pan.trim().toUpperCase() : undefined,
        aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : undefined,
        address: address ? address.trim() : undefined,
        city: city ? city.trim() : undefined,
        state: state ? state.trim() : undefined,
        pincode: pincode ? pincode.trim() : undefined,
        status: 'pending',
      });

      user.dealerProfileId = dealerProfile._id;
      await user.save();
    }

    await OtpVerification.deleteOne({ _id: verifiedOtp._id });

    // Create session and issue tokens for immediate login
    const sessionData = await this.createSessionAndIssueTokens(user, reqInfo);

    return {
      message: isDealer
        ? 'Dealer registration submitted! Your account is in Pending Review. You can browse catalog items with Standard pricing while Admin reviews your KYC.'
        : 'Account created successfully! Welcome to Vinexus.',
      ...sessionData,
    };
  },

  /**
   * Log in or Register user using Google Auth credentials.
   */
  async googleLogin({ credential, email, name, googleId, reqInfo }) {
    let userEmail = email;
    let userName = name;
    let userGoogleId = googleId;

    // If credential (JWT Token from Google Identity Services) is provided, decode payload
    if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userEmail = payload.email || userEmail;
          userName = payload.name || payload.given_name || userName;
          userGoogleId = payload.sub || userGoogleId;
        }
      } catch (err) {
        console.warn('Google credential parsing warning:', err);
      }
    }

    if (!userEmail) {
      throw new AppError('Google login failed: Email not provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Register new customer account automatically
      const displayName = (userName && userName.trim()) || normalizedEmail.split('@')[0];
      user = await User.create({
        fullName: displayName,
        name: displayName,
        email: normalizedEmail,
        googleId: userGoogleId || `google_${Date.now()}`,
        role: 'customer',
        isEmailVerified: true,
        isPhoneVerified: true,
        accountStatus: 'active',
        status: 'active',
      });
    } else {
      if (user.role === 'admin') {
        throw new AppError('This is Not Admin Portal', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      }

      if (user.accountStatus === 'blocked' || user.status === 'blocked') {
        throw new AppError('Your account has been blocked. Please contact support.', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      }

      if (!user.googleId && userGoogleId) {
        user.googleId = userGoogleId;
        await user.save();
      }
    }

    // Create session & issue tokens
    return await this.createSessionAndIssueTokens(user, reqInfo);
  },

  /**
   * Generates and dispatches an OTP for signup, login, or phone-change.
   */
  async sendOtp({ identifier, purpose = 'login', portal, password }) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) {
      throw new AppError('Identifier is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    // For login and password-reset purposes: ensure user exists
    if (purpose === 'login' || purpose === 'password-reset') {
      const isEmail = normalized.includes('@');
      // +passwordHash: needed below for the admin-portal password check.
      // Harmless for every other branch - this user document is never
      // returned to the caller, only used internally to build the response.
      const user = await User.findOne(isEmail ? { email: normalized } : { phone: normalized }).select('+passwordHash');
      if (!user) {
        throw new AppError(
          purpose === 'password-reset'
            ? 'No registered user account found with this email or phone number.'
            : 'No registered user account found with this email or phone number. Please signup first.',
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

      // Admin-portal-specific role gating only applies to the login flow -
      // password-reset is available to any account regardless of surface.
      if (purpose === 'login') {
        // Dedicated admin login surface (/admin/login): reject non-admin accounts
        if (portal === 'admin') {
          if (user.role !== 'admin') {
            throw new AppError(
              'This portal is strictly reserved for system administrators. Non-admin accounts cannot sign in here.',
              HTTP_STATUS.FORBIDDEN,
              ERROR_CODES.FORBIDDEN
            );
          }

          // Two-factor admin sign-in: password is verified BEFORE an OTP is
          // ever generated/sent. No passwordHash set at all (e.g. a freshly
          // seeded admin who hasn't used /forgot-password yet) is treated
          // as a hard failure, not an open door.
          const passwordMatches = user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
          if (!passwordMatches) {
            throw new AppError(
              'Invalid administrator credentials.',
              HTTP_STATUS.UNAUTHORIZED,
              ERROR_CODES.UNAUTHORIZED
            );
          }
        } else {
          // Standard customer/dealer login surface (/login): reject admin accounts
          if (user.role === 'admin') {
            throw new AppError(
              'This is Not Admin Portal',
              HTTP_STATUS.FORBIDDEN,
              ERROR_CODES.FORBIDDEN
            );
          }
        }
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

    try {
      if (normalized.includes('@')) {
        await emailService.sendOtpEmail({ email: normalized, otp, purpose });
      } else {
        const provider = getOtpProvider();
        await provider.sendOtp({ identifier: normalized, otp, purpose });
      }
    } catch (dispatchErr) {
      // In demo mode, real delivery is a nice-to-have, not a requirement -
      // the OTP is always the fixed devOtp anyway (see generateOtp above),
      // so an unconfigured or misbehaving SMS/email provider must never
      // block signup/login. Outside demo mode this is a real failure.
      if (!config.demoMode) {
        throw dispatchErr;
      }
      console.warn(
        `[AuthService] OTP dispatch to '${normalized}' failed, continuing in demo mode:`,
        dispatchErr.message
      );
    }

    // Expose the OTP whenever it's the fixed demo code (or outside
    // production) regardless of what the active provider's response
    // happened to look like - the real, always-true fact is "the OTP is
    // 123456 right now", not whatever a provider's success payload says.
    const devOtp = config.demoMode || config.nodeEnv !== 'production' ? otp : undefined;

    return {
      identifier: normalized,
      purpose,
      expiresAt,
      devOtp,
    };
  },

  /**
   * Verifies OTP. Handles session creation or single active session conflict.
   */
  async verifyOtp({ identifier, otp, purpose = 'login', portal, reqInfo }) {
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

    // Dedicated admin login surface (/admin/login): reject non-admin accounts
    if (portal === 'admin') {
      if (user.role !== 'admin') {
        throw new AppError(
          'This portal is strictly reserved for system administrators. Non-admin accounts cannot sign in here.',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }
    } else {
      // Standard customer/dealer login surface (/login): reject admin accounts
      if (user.role === 'admin') {
        throw new AppError(
          'This is Not Admin Portal',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }
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
   * Verifies a pre-account "signup" OTP (email for customers, phone for
   * dealers) so the multi-step signup wizard can confirm contact ownership
   * BEFORE the account exists. Unlike verifyOtp(), this never requires (or
   * touches) a User record and never issues session tokens - it only marks
   * the OtpVerification record verified so authService.signup() can check
   * for it. The actual account is created by a separate /auth/signup call
   * right after this succeeds.
   */
  async verifySignupOtp({ identifier, otp }) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized || !otp) {
      throw new AppError('Identifier and OTP are required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const otpRecord = await OtpVerification.findOne({ identifier: normalized, purpose: 'signup' });
    if (!otpRecord || otpRecord.isVerified) {
      throw new AppError(
        'No pending OTP request found for this identifier. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new AppError('OTP has expired. Please request a new OTP.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
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
      throw new AppError('Invalid OTP. Please check and try again.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_CREDENTIALS);
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    return { verified: true, identifier: normalized };
  },

  /**
   * Verifies a "forgot password" OTP for an existing account and, on
   * success, issues a short-lived single-purpose reset ticket. The ticket
   * (not the OTP again) is what authorizes the actual password change in
   * resetPassword() below - this keeps the OTP itself single-use.
   */
  async verifyResetOtp({ identifier, otp }) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized || !otp) {
      throw new AppError('Identifier and OTP are required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const otpRecord = await OtpVerification.findOne({ identifier: normalized, purpose: 'password-reset' });
    if (!otpRecord || otpRecord.isVerified) {
      throw new AppError(
        'No pending OTP request found for this identifier. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new AppError('OTP has expired. Please request a new OTP.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
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
      throw new AppError('Invalid OTP. Please check and try again.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_CREDENTIALS);
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    const isEmail = normalized.includes('@');
    const user = await User.findOne(isEmail ? { email: normalized } : { phone: normalized });
    if (!user) {
      throw new AppError('No registered user account found with this email or phone number.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const resetToken = generatePasswordResetTicket({ userId: user._id, identifier: normalized });

    return { verified: true, identifier: normalized, resetToken };
  },

  /**
   * Completes a password reset: verifies the single-purpose reset ticket
   * issued by verifyResetOtp(), sets the new password, and revokes every
   * currently active session for the account so a stolen device is logged
   * out the moment the password changes.
   */
  async resetPassword({ resetToken, newPassword }) {
    if (!resetToken || !newPassword) {
      throw new AppError('Reset token and new password are required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    let decoded;
    try {
      decoded = verifyPasswordResetTicket(resetToken);
    } catch (err) {
      throw new AppError('Invalid or expired reset session. Please start over.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (user.accountStatus === 'blocked' || user.status === 'blocked') {
      throw new AppError('Your account has been blocked. Please contact support.', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // The signed JWT alone is stateless and would remain valid (and
    // replayable) for its whole 10-minute window even after being used
    // once. Tie it to the specific verified OTP record it was issued for
    // and consume that record here, so the same resetToken cannot reset
    // the password a second time.
    const otpRecord = await OtpVerification.findOne({
      identifier: decoded.identifier,
      purpose: 'password-reset',
      isVerified: true,
    });
    if (!otpRecord) {
      throw new AppError('Invalid or expired reset session. Please start over.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Consume the OTP record so this resetToken can't be replayed.
    await OtpVerification.deleteOne({ _id: otpRecord._id });

    // Log every active session out - the password just changed.
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );

    return { success: true };
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

    // Check dealer status if role is dealer
    let dealerStatus = null;
    if (user.role === 'dealer') {
      const dp = await DealerProfile.findOne({ userId: user._id });
      dealerStatus = dp?.status || 'pending';
    }

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
        dealerStatus,
        kycStatus: dealerStatus,
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

    let dealerStatus = null;
    if (user.role === 'dealer') {
      const dp = await DealerProfile.findOne({ userId: user._id });
      dealerStatus = dp?.status || 'pending';
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
        dealerStatus,
        kycStatus: dealerStatus,
        createdAt: user.createdAt,
      },
      sessionId,
    };
  },

  /**
   * Updates user profile (fullName, email, phone, dob, address, password, dealer details)
   */
  async updateProfile(userId, data) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const {
      fullName,
      email,
      phone,
      dob,
      address,
      companyName,
      gstin,
      pan,
      city,
      state,
      pincode,
      currentPassword,
      newPassword,
    } = data;

    // Update Name
    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
      user.name = fullName.trim();
    }

    // Update Email (check for duplicates if changed)
    if (email && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existingUser) {
        throw new AppError('Email address is already in use by another account', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
      }
      user.email = normalizedEmail;
    }

    // Update Phone (check for duplicates if changed)
    if (phone && phone.trim() !== (user.phone || '')) {
      const normalizedPhone = phone.trim();
      const existingUser = await User.findOne({ phone: normalizedPhone, _id: { $ne: userId } });
      if (existingUser) {
        throw new AppError('Phone number is already in use by another account', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
      }
      user.phone = normalizedPhone;
    }

    if (dob) {
      user.dob = new Date(dob);
    }

    if (address) {
      user.address = address.trim();
    }

    // Update Password if newPassword provided
    if (newPassword) {
      if (user.passwordHash && currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          throw new AppError('Current password is incorrect', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
        }
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // If user is a dealer, update DealerProfile details
    let dealerProfile = null;
    let dealerStatus = null;
    if (user.role === 'dealer') {
      dealerProfile = await DealerProfile.findOne({ userId: user._id });
      if (dealerProfile) {
        if (companyName) dealerProfile.companyName = companyName.trim();
        if (gstin !== undefined) dealerProfile.gstin = gstin ? gstin.trim().toUpperCase() : '';
        if (pan !== undefined) dealerProfile.pan = pan ? pan.trim().toUpperCase() : '';
        if (address) dealerProfile.address = address.trim();
        if (city) dealerProfile.city = city.trim();
        if (state) dealerProfile.state = state.trim();
        if (pincode) dealerProfile.pincode = pincode.trim();
        await dealerProfile.save();
        dealerStatus = dealerProfile.status;
      }
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
        dealerStatus,
        kycStatus: dealerStatus,
        address: user.address,
        dob: user.dob,
        dealerProfile,
        createdAt: user.createdAt,
      },
      message: 'Profile updated successfully',
    };
  },
};

export default authService;
