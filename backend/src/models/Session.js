import mongoose from 'mongoose';

const deviceInfoSchema = new mongoose.Schema(
  {
    userAgent: { type: String, trim: true },
    platform: { type: String, trim: true },
    browser: { type: String, trim: true },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    userType: {
      type: String,
      enum: ['customer', 'dealer', 'admin'],
      default: 'customer',
      required: [true, 'User type is required'],
    },
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      unique: true,
      trim: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    deviceInfo: {
      type: deviceInfoSchema,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiration date is required'],
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding active user session and verifying refreshTokenHash
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ refreshTokenHash: 1 });

export const Session = mongoose.model('Session', sessionSchema);
export default Session;
