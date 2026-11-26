import '../audit/audit.js';
import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessRole', required: true },
  workDate: { type: String, required: true }, revision: { type: Number, required: true },
  passwordHash: { type: String, select: false }, passwordCiphertext: { type: String, select: false },
  passwordIv: { type: String, select: false }, passwordAuthTag: { type: String, select: false },
  issuedAt: { type: Date, required: true }, loginFrom: { type: Date, required: true }, expiresAt: { type: Date, required: true },
  discardedAt: { type: Date, default: null }, purgeAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ userId: 1, roleId: 1, workDate: 1, revision: 1 }, { unique: true });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export const EmployeeWorkCredential = mongoose.model('EmployeeWorkCredential', schema);
