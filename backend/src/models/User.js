import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'dealer', 'admin'],
      default: 'customer',
      required: [true, 'User role is required'],
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      trim: true,
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'active', 'blocked'],
      default: 'pending',
      required: [true, 'Account status is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'blocked'],
      default: 'pending',
      required: [true, 'User status is required'],
    },
    dealerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DealerProfile',
    },
    currentSessionId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Sync name with fullName before validation
userSchema.pre('validate', function (next) {
  if (this.fullName && !this.name) {
    this.name = this.fullName;
  } else if (this.name && !this.fullName) {
    this.fullName = this.name;
  }
  next();
});

// Partial unique indexes ensure uniqueness ONLY when email or phone is present as a string.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

export const User = mongoose.model('User', userSchema);
export default User;
