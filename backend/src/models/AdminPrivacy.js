import '../audit/audit.js';
import mongoose from 'mongoose';

const securitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  pinHash: { type: String, select: false },
  pinVersion: { type: Number, default: 0 },
  pinAttempts: { type: Number, default: 0 },
  pinBlockedUntil: Date,
  lastOtpAt: Date,
}, { timestamps: true });
export const AdminPrivacy = mongoose.model('AdminPrivacy', securitySchema);
const challengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challengeTokenHash: { type: String, required: true, unique: true },
  otpHash: { type: String, required: true, select: false },
  passwordStamp: { type: String, required: true, select: false },
  pinVersion: { type: Number, required: true },
  sessionId: { type: String, default: null },
  phone: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AdminPinChallenge = mongoose.model('AdminPinChallenge', challengeSchema);
