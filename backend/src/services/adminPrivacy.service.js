import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { AdminPrivacy, AdminPinChallenge } from '../models/AdminPrivacy.js';
import { config } from '../config/env.js';
import { getOtpProvider } from '../integrations/otp/index.js';
import { normalizePhoneNumber, isValidIndianPhone } from '../utils/phone.util.js';
import { isSuperAdmin } from '../../../shared/adminAccess.js';
import { AppError } from '../utils/AppError.js';

const fail = (message, status = 400, code = 'VALIDATION_ERROR') => { throw new AppError(message, status, code); };
const digest = value => crypto.createHmac('sha256', config.jwtSecret).update(value).digest('hex');
const equalDigest = (left, right) => crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
const validOwner = user => isSuperAdmin(user) && user.accountStatus !== 'blocked' && user.status !== 'blocked';
const owner = async (id, password) => {
  const user = await User.findById(id).select('+passwordHash');
  if (!validOwner(user)) fail('Only an active super admin can manage the privacy PIN.', 403, 'FORBIDDEN');
  if (!user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) fail('The administrator password is incorrect.', 401, 'INVALID_CREDENTIALS');
  return user;
};
const credential = async userId => {
  // A unique user index makes initialization safe under concurrent tabs.
  try { return await AdminPrivacy.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true }).select('+pinHash'); }
  catch (error) { if (error.code !== 11000) throw error; return AdminPrivacy.findOne({ userId }).select('+pinHash'); }
};
const checkPin = async (record, pin) => {
  const now = new Date();
  if (record.pinBlockedUntil > now) fail('Too many incorrect PIN attempts. Try again in 15 minutes or reset your PIN.', 429, 'PIN_RATE_LIMITED');
  if (record.pinBlockedUntil) {
    await AdminPrivacy.updateOne({ _id: record._id, pinBlockedUntil: record.pinBlockedUntil }, { $set: { pinAttempts: 0 }, $unset: { pinBlockedUntil: 1 } });
  }
  if (!record.pinHash || !await bcrypt.compare(pin, record.pinHash)) {
    const updated = await AdminPrivacy.findOneAndUpdate({ _id: record._id, pinHash: record.pinHash }, { $inc: { pinAttempts: 1 } }, { new: true });
    if (updated?.pinAttempts >= 5) await AdminPrivacy.updateOne({ _id: record._id, pinAttempts: { $gte: 5 } }, { $set: { pinBlockedUntil: new Date(Date.now() + 15 * 60000) } });
    fail('Incorrect privacy PIN.', 400, 'INVALID_PIN');
  }
  const accepted = await AdminPrivacy.findOneAndUpdate({ _id: record._id, pinHash: record.pinHash, pinAttempts: { $lt: 5 }, $or: [{ pinBlockedUntil: null }, { pinBlockedUntil: { $lte: now } }] }, { $set: { pinAttempts: 0 }, $unset: { pinBlockedUntil: 1 } });
  if (!accepted) fail('The PIN changed or too many attempts were made. Please try again or reset your PIN.', 409, 'PIN_CHANGED');
};
// PIN changes and lock-state updates commit together. Other sessions stay private.
const replacePin = async (userId, hash, expectedVersion, currentSessionId, transaction, consume) => {
  const updated = await AdminPrivacy.findOneAndUpdate({ userId, pinVersion: expectedVersion }, { $set: { pinHash: hash, pinAttempts: 0 }, $inc: { pinVersion: 1 }, $unset: { pinBlockedUntil: 1 } }, { new: true, session: transaction });
  if (!updated) fail('The privacy PIN changed. Start again.', 409, 'PIN_CHANGED');
  if (consume) await AdminPinChallenge.deleteOne({ _id: consume }, { session: transaction });
  await Session.updateMany({ userId, isActive: true }, { $set: { privacyLocked: true } }, { session: transaction });
  if (currentSessionId) await Session.updateOne({ sessionId: currentSessionId, userId, isActive: true }, { $set: { privacyLocked: false } }, { session: transaction });
};
export const adminPrivacyService = {
  async status(userId, session) {
    const record = await AdminPrivacy.findOne({ userId }).select('+pinHash');
    return { configured: Boolean(record?.pinHash), locked: session.privacyLocked === true };
  },
  async lock(userId, sessionId) {
    await Session.updateOne({ userId, sessionId, isActive: true }, { $set: { privacyLocked: true } });
    return { locked: true };
  },
  async unlock(userId, sessionId, pin) {
    const record = await credential(userId);
    if (!record.pinHash) fail('Set your privacy PIN using your administrator password first.', 409, 'PIN_NOT_SET');
    await checkPin(record, pin);
    await mongoose.connection.transaction(async session => {
      // Writing the credential serializes this unlock against a simultaneous reset.
      const current = await AdminPrivacy.updateOne({ _id: record._id, pinVersion: record.pinVersion }, { $set: { updatedAt: new Date() } }, { session });
      if (!current.matchedCount) fail('The PIN changed. Try the new PIN.', 409, 'PIN_CHANGED');
      await Session.updateOne({ userId, sessionId, isActive: true }, { $set: { privacyLocked: false } }, { session });
    });
    return { configured: true, locked: false };
  },
  async setPin(userId, sessionId, { password, currentPin, newPin }) {
    await owner(userId, password);
    const record = await credential(userId);
    if (record.pinHash) {
      if (!currentPin) fail('Enter your current PIN or use Forgot PIN.');
      await checkPin(record, currentPin);
    }
    const hash = await bcrypt.hash(newPin, 12);
    await mongoose.connection.transaction(session => replacePin(userId, hash, record.pinVersion, sessionId, session));
    return { configured: true, locked: false };
  },
  async requestReset({ email, password }, authenticatedUserId, sessionId) {
    let user;
    if (authenticatedUserId) user = await owner(authenticatedUserId, password);
    else {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
      if (!validOwner(user) || !user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) fail('Super admin email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    const phone = normalizePhoneNumber(user.phone);
    if (!isValidIndianPhone(phone)) fail('Your super admin account needs a valid registered mobile number to receive an OTP.');
    const record = await credential(user._id);
    const now = new Date(), cooldown = config.otpResendCooldownSeconds * 1000;
    const allowed = await AdminPrivacy.findOneAndUpdate({ _id: record._id, $or: [{ lastOtpAt: null }, { lastOtpAt: { $lte: new Date(Date.now() - cooldown) } }] }, { $set: { lastOtpAt: now } });
    if (!allowed) fail(`Please wait ${config.otpResendCooldownSeconds} seconds before requesting another PIN reset OTP.`, 429, 'OTP_RATE_LIMITED');
    const challengeToken = crypto.randomBytes(32).toString('hex');
    const otp = config.mockOtpEnabled ? config.mockOtpCode : crypto.randomInt(100000, 1000000).toString();
    const challenge = await AdminPinChallenge.create({ userId: user._id, challengeTokenHash: digest(challengeToken), otpHash: digest(`${challengeToken}:${otp}`), passwordStamp: digest(user.passwordHash), pinVersion: record.pinVersion, sessionId: authenticatedUserId ? sessionId : null, phone, expiresAt: new Date(Date.now() + config.otpExpiryMinutes * 60000) });
    try {
      if (!config.mockOtpEnabled) await getOtpProvider().sendOtp({ identifier: phone, otp, purpose: 'privacy-pin-reset' });
    } catch (error) {
      await AdminPinChallenge.deleteOne({ _id: challenge._id });
      await AdminPrivacy.updateOne({ _id: record._id, lastOtpAt: now }, { $unset: { lastOtpAt: 1 } });
      throw error;
    }
    return { challengeToken, maskedPhone: `••••••${phone.slice(-4)}`, expiresAt: challenge.expiresAt, resendAvailableInSeconds: config.otpResendCooldownSeconds, ...(config.mockOtpEnabled ? { mockOtp: otp } : {}) };
  },
  async resetPin({ challengeToken, otp, newPin }, authenticatedUserId, sessionId) {
    // Reserve an attempt before comparing the code so concurrent guesses cannot bypass the limit.
    const challenge = await AdminPinChallenge.findOneAndUpdate({ challengeTokenHash: digest(challengeToken), expiresAt: { $gt: new Date() }, attempts: { $lt: config.otpMaxAttempts }, ...(authenticatedUserId ? { userId: authenticatedUserId, sessionId } : { sessionId: null }) }, { $inc: { attempts: 1 } }, { new: true }).select('+otpHash +passwordStamp');
    if (!challenge || !equalDigest(challenge.otpHash, digest(`${challengeToken}:${otp}`))) fail('Invalid or expired PIN reset OTP. Request another code if needed.', 400, 'INVALID_OTP');
    const hash = await bcrypt.hash(newPin, 12);
    await mongoose.connection.transaction(async session => {
      const pending = await AdminPinChallenge.findById(challenge._id).session(session);
      const user = await User.findById(challenge.userId).select('+passwordHash').session(session);
      if (!pending || pending.expiresAt <= new Date() || !validOwner(user) || !user.passwordHash || !equalDigest(digest(user.passwordHash), challenge.passwordStamp) || normalizePhoneNumber(user.phone) !== challenge.phone) fail('This reset request is no longer valid. Start again.', 409, 'RESET_EXPIRED');
      await replacePin(user._id, hash, challenge.pinVersion, authenticatedUserId ? sessionId : null, session, challenge._id);
    });
    return { configured: true, locked: !authenticatedUserId };
  },
};
