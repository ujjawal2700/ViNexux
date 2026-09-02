import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: [true, 'Identifier (email or phone) is required'],
      trim: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },
    purpose: {
      type: String,
      enum: ['signup', 'login', 'phone-change'],
      required: [true, 'OTP purpose is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, 'Attempts cannot be negative'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge expired OTP records from MongoDB
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast OTP lookup by identifier and purpose
otpVerificationSchema.index({ identifier: 1, purpose: 1 });

export const OtpVerification = mongoose.model('OtpVerification', otpVerificationSchema);
export default OtpVerification;
