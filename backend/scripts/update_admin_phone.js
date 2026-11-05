import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { isValidIndianPhone, normalizePhoneNumber } from '../src/utils/phone.util.js';

// A targeted update for an existing administrator; never reseeds other data.
export async function updateAdminPhone({ email, phone, users = User }) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !isValidIndianPhone(phone)) {
    throw new Error('Set ADMIN_DEFAULT_EMAIL and a valid ADMIN_DEFAULT_PHONE before running this command.');
  }
  const normalizedPhone = normalizePhoneNumber(phone);
  const admin = await users.findOne({ email: normalizedEmail, role: 'admin' });
  if (!admin) throw new Error('No administrator matches ADMIN_DEFAULT_EMAIL. No account was changed.');
  if (admin.phone === normalizedPhone) return { changed: false };
  const result = await users.updateOne(
    { _id: admin._id, role: 'admin', phone: admin.phone },
    { $set: { phone: normalizedPhone, isPhoneVerified: false } },
    { runValidators: true }
  );
  if (result.matchedCount !== 1) throw new Error('Administrator changed during the update. Retry the command.');
  return { changed: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    const result = await updateAdminPhone({
      email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@vinexus.in',
      phone: process.env.ADMIN_DEFAULT_PHONE,
    });
    console.log(result.changed ? 'Administrator mobile number updated. Password and other accounts were preserved.' : 'Administrator already has the configured mobile number.');
  } catch (error) {
    // Provider/connection errors can include credentials; never print raw errors.
    console.error(error.code === 11000 ? 'That mobile number already belongs to another account. No account was changed.'
      : error instanceof mongoose.Error ? 'Database update failed. Check connectivity and the configured administrator.'
      : error.message.startsWith('Set ADMIN_') || error.message.startsWith('No administrator') || error.message.startsWith('Administrator changed')
        ? error.message : 'Administrator update failed. Check database connectivity and environment settings.');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
