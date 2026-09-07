import mongoose from 'mongoose';

const kycDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['gst', 'pan', 'aadhaar'],
      required: [true, 'KYC document type is required'],
    },
    url: {
      type: String,
      required: [true, 'KYC document URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const dealerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Please enter a valid GSTIN format',
      ],
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN format'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [255, 'Address cannot exceed 255 characters'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
    },
    kycDocuments: [kycDocumentSchema],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: [true, 'KYC status is required'],
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    kycReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kycReviewedAt: {
      type: Date,
      default: null,
    },
    kycReviewAction: {
      type: String,
      enum: ['approved', 'rejected', 'revoked'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index on status for administrative querying/filtering of dealer profiles
dealerProfileSchema.index({ status: 1 });

export const DealerProfile = mongoose.model('DealerProfile', dealerProfileSchema);
export default DealerProfile;
