import mongoose from 'mongoose';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { User } from '../models/User.js';
import { PosSale } from '../models/PosSale.js';
import { PosCustomerOtp } from '../models/PosCustomerOtp.js';
import { config } from '../config/env.js';
import { getOtpProvider } from '../integrations/otp/index.js';
import { normalizePhoneNumber, isValidIndianPhone } from '../utils/phone.util.js';
import { AppError } from '../utils/AppError.js';

const fail = (message, code = 400) => { throw new AppError(message, code, 'VALIDATION_ERROR'); };
const phoneNumber = raw => {
  if (!isValidIndianPhone(raw)) fail('Enter a valid Indian mobile number.');
  return normalizePhoneNumber(raw);
};
const aliases = phone => [phone, `91${phone}`, `+91${phone}`];
const key = (phone, adminId) => `${adminId}:${phone}`;
const hash = (id, otp) => createHmac('sha256', config.jwtSecret).update(`${id}:${otp}`).digest('hex');
const checkUser = user => {
  if (user && user.role !== 'customer') fail('This phone belongs to a dealer or admin account. Use a customer phone number.', 409);
  if (user && (user.accountStatus === 'blocked' || user.status === 'blocked')) fail('This customer account is blocked.', 403);
};
export const customerBillingDetails = user => {
  const profile = user.posBillingProfile || {};
  const address = user.savedAddresses?.find(a => a.label === 'POS billing') || user.savedAddresses?.find(a => a.isDefault) || user.savedAddresses?.[0];
  return { name: user.fullName || user.name || '', phone: normalizePhoneNumber(user.phone), whatsappNumber: profile.whatsappNumber || normalizePhoneNumber(user.phone),
    email: user.email || '', address: profile.address || [address?.line1, address?.line2].filter(Boolean).join(', ') || user.address || '',
    city: profile.city || address?.city || '', state: profile.state || address?.state || '', stateCode: profile.stateCode || '',
    pincode: profile.pincode || address?.pincode || '', gstin: profile.gstin || '' };
};

export const posCustomerService = {
  async findKnown(phone, session = null) {
    const user = await User.findOne({ phone: { $in: aliases(phone) } }).session(session);
    checkUser(user);
    if (user) return { user, customer: customerBillingDetails(user) };
    // Preserve returning-customer behavior for POS invoices issued before the
    // shared customer directory was introduced. This never claims OTP proof.
    const previous = await PosSale.findOne({ 'customer.phone': { $in: aliases(phone) } }).sort({ createdAt: -1 }).session(session).lean();
    return previous ? { user: null, customer: { ...previous.customer, phone }, legacy: true } : null;
  },
  async lookup(raw, adminId) {
    const phone = phoneNumber(raw);
    const known = await this.findKnown(phone);
    if (known) return { found: true, customerId: known.user?._id || null, customer: known.customer, needsVerification: false };
    const proof = await PosCustomerOtp.findById(key(phone, adminId)).lean();
    const verified = !!proof?.verifiedAt && proof.expiresAt > new Date();
    return { found: false, customer: null, needsVerification: !verified, verified,
      otpPending: !!proof && !verified && proof.expiresAt > new Date() && proof.attempts < config.otpMaxAttempts,
      resendAvailableInSeconds: proof?.sentAt ? Math.max(0, Math.ceil((proof.sentAt.getTime() + config.otpResendCooldownSeconds * 1000 - Date.now()) / 1000)) : 0 };
  },
  async sendOtp(raw, adminId) {
    const phone = phoneNumber(raw);
    const known = await this.findKnown(phone);
    if (known) return { existing: true, customer: known.customer, needsVerification: false };
    const id = key(phone, adminId), now = new Date();
    const cutoff = new Date(now.getTime() - config.otpResendCooldownSeconds * 1000);
    const otp = config.mockOtpEnabled ? config.mockOtpCode : String(randomInt(100000, 1000000));
    let record;
    try {
      record = await PosCustomerOtp.findOneAndUpdate({ _id: id, $or: [{ sentAt: { $lte: cutoff } }, { sentAt: { $exists: false } }] },
        { $set: { phone, adminId, otpHash: hash(id, otp), sentAt: now, expiresAt: new Date(now.getTime() + config.otpExpiryMinutes * 60000), verifiedAt: null, attempts: 0 } },
        { upsert: true, new: true });
    } catch (error) {
      if (error.code === 11000) fail(`Please wait ${config.otpResendCooldownSeconds} seconds before requesting another OTP.`, 429);
      throw error;
    }
    try {
      if (!config.mockOtpEnabled) await getOtpProvider().sendOtp({ identifier: phone, otp, purpose: 'pos-customer' });
    } catch (error) {
      await PosCustomerOtp.deleteOne({ _id: id, otpHash: record.otpHash });
      throw error;
    }
    return { phone, expiresAt: record.expiresAt, resendAvailableInSeconds: config.otpResendCooldownSeconds,
      ...(config.mockOtpEnabled ? { mockOtp: otp, mockOtpEnabled: true } : {}) };
  },
  async verifyOtp(raw, otp, adminId) {
    const phone = phoneNumber(raw), id = key(phone, adminId), now = new Date();
    const record = await PosCustomerOtp.findById(id);
    if (!record || record.expiresAt <= now) fail('OTP expired or missing. Request a new code.');
    if (record.attempts >= config.otpMaxAttempts) fail('Too many incorrect attempts. Request a new code.', 429);
    if (!timingSafeEqual(Buffer.from(record.otpHash, 'hex'), Buffer.from(hash(id, otp), 'hex'))) {
      await PosCustomerOtp.updateOne({ _id: id, otpHash: record.otpHash }, { $inc: { attempts: 1 } });
      fail('Incorrect OTP. Please try again.');
    }
    const verified = await PosCustomerOtp.findOneAndUpdate({ _id: id, otpHash: record.otpHash, attempts: { $lt: config.otpMaxAttempts }, expiresAt: { $gt: now } },
      { $set: { verifiedAt: now } }, { new: true });
    if (!verified) fail('OTP expired or exhausted. Request a new code.');
    return { phone, verified: true };
  },
  async persist(input, adminId, session) {
    const phone = phoneNumber(input.phone);
    const known = await this.findKnown(phone, session);
    const proof = !known ? await PosCustomerOtp.findById(key(phone, adminId)).session(session) : null;
    if (!known && (!proof?.verifiedAt || proof.expiresAt <= new Date())) fail('Verify the new customer phone number by OTP before saving.', 403);
    const user = known?.user || new User({ phone, role: 'customer', createdVia: 'pos', isPhoneVerified: !!proof?.verifiedAt, accountStatus: 'active', status: 'active' });
    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email) { user.email = email; user.isEmailVerified = false; }
    user.fullName = input.name; user.name = input.name; user.address = input.address;
    user.posBillingProfile = { whatsappNumber: input.whatsappNumber, address: input.address, city: input.city,
      state: input.state, stateCode: input.stateCode, pincode: input.pincode, gstin: input.gstin };
    const address = { label: 'POS billing', line1: input.address.slice(0, 255), line2: input.address.slice(255), city: input.city, state: input.state, pincode: input.pincode };
    const stored = user.savedAddresses.find(a => a.label === 'POS billing');
    if (stored) Object.assign(stored, address);
    else user.savedAddresses.push({ ...address, isDefault: !user.savedAddresses.some(a => a.isDefault) });
    await user.save({ session });
    if (proof) await PosCustomerOtp.deleteOne({ _id: proof._id }).session(session);
    return { user, customer: customerBillingDetails(user) };
  },
  async save(input, adminId) {
    const session = await mongoose.startSession();
    let result;
    try { await session.withTransaction(async () => { result = await this.persist(input, adminId, session); }); }
    finally { await session.endSession(); }
    return { customerId: result.user._id, customer: result.customer, needsVerification: false, found: true };
  },
};
