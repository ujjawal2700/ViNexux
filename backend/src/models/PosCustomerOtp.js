import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String, phone: String, adminId: mongoose.Schema.Types.ObjectId, otpHash: String,
  expiresAt: Date, sentAt: Date, verifiedAt: Date, attempts: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PosCustomerOtp = mongoose.model('PosCustomerOtp', schema);
