import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { OtpVerification } from '../src/models/OtpVerification.js';
import { Cart } from '../src/models/Cart.js';
import { PushDevice } from '../src/models/PushDevice.js';
import { isValidIndianPhone, normalizePhoneNumber } from '../src/utils/phone.util.js';

// Explicitly authorized account deletion and phone transfer; never promotes
// the customer or changes the administrator's password or permissions.
let session;
try {
  if (!process.argv.includes('--delete-customer')) throw new Error('CONFIRMATION_REQUIRED');
  const phone = normalizePhoneNumber(process.env.ADMIN_DEFAULT_PHONE);
  const email = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@vinexus.in').trim().toLowerCase();
  if (!isValidIndianPhone(phone)) throw new Error('INVALID_PHONE');
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  session = await mongoose.startSession();
  let adminId, customerId, passwordHash;
  await session.withTransaction(async () => {
    const admin = await User.findOne({ email, role: 'admin' }).select('+passwordHash').session(session).lean();
    const customer = await User.findOne({ phone, role: 'customer' }).session(session).lean();
    if (!admin || !customer || String(admin._id) === String(customer._id)) throw new Error('ACCOUNT_MISMATCH');
    adminId = admin._id;
    customerId = customer._id;
    passwordHash = admin.passwordHash;
    const deleted = await User.deleteOne({ _id: customerId, role: 'customer', phone }, { session });
    if (deleted.deletedCount !== 1) throw new Error('ACCOUNT_CHANGED');
    const updated = await User.updateOne(
      { _id: adminId, role: 'admin', phone: admin.phone },
      { $set: { phone, isPhoneVerified: false } }, { session, runValidators: true }
    );
    if (updated.matchedCount !== 1) throw new Error('ACCOUNT_CHANGED');
    await Session.deleteMany({ userId: customerId }, { session });
    await Session.updateMany({ userId: adminId, isActive: true }, { $set: { isActive: false, revokedAt: new Date() } }, { session });
    await Cart.deleteMany({ userId: customerId }, { session });
    await PushDevice.deleteMany({ userId: customerId }, { session });
    const identifiers = [...new Set([phone, admin.phone, admin.email, customer.email].filter(Boolean))];
    await OtpVerification.deleteMany({ identifier: { $in: identifiers } }, { session });
  });
  const admin = await User.findById(adminId).select('+passwordHash').lean();
  const remainingCustomer = await User.exists({ _id: customerId });
  if (admin?.phone !== phone || admin?.role !== 'admin' || admin.passwordHash !== passwordHash || remainingCustomer) {
    throw new Error('VERIFICATION_FAILED');
  }
  console.log(JSON.stringify({ adminPhone: phone, adminRole: admin.role, customerDeleted: true, adminPasswordPreserved: true, previousSessionsRevoked: true }));
} catch (error) {
  console.error(JSON.stringify({ error: 'Account transfer failed', code: typeof error.code === 'number' ? error.code : ['CONFIRMATION_REQUIRED', 'INVALID_PHONE', 'ACCOUNT_MISMATCH', 'ACCOUNT_CHANGED', 'VERIFICATION_FAILED'].includes(error.message) ? error.message : 'DATABASE_ERROR' }));
  process.exitCode = 1;
} finally {
  if (session) await session.endSession();
  await mongoose.disconnect();
}
