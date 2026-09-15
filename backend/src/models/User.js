import mongoose from 'mongoose';

// A user's saved delivery address book. Unlike Enquiry.deliveryAddress (a
// per-enquiry immutable snapshot) or DealerProfile's single business
// address, these are reusable, individually manageable entries a customer
// or dealer picks from at checkout - so (unlike those two) each entry keeps
// its own auto _id for direct addressing via PUT/DELETE /addresses/:id.
const savedAddressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [50, 'Label cannot exceed 50 characters'],
      default: 'Address',
    },
    line1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
      maxlength: [255, 'Address line 1 cannot exceed 255 characters'],
    },
    line2: {
      type: String,
      trim: true,
      maxlength: [255, 'Address line 2 cannot exceed 255 characters'],
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

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
      trim: true,
    },
    dob: {
      type: Date,
    },
    googleId: {
      type: String,
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
    // Firebase Cloud Messaging device/browser registration tokens for push
    // notifications. A user can have several (multiple browsers/devices).
    fcmTokens: {
      type: [String],
      default: [],
    },
    // Reusable saved delivery addresses (customer & dealer). Selected from
    // at enquiry checkout; see address.service.js.
    savedAddresses: {
      type: [savedAddressSchema],
      default: [],
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
