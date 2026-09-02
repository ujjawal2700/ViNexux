import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      default: 1,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'resolved', 'cancelled'],
      default: 'pending',
      required: [true, 'Enquiry status is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fetching a user's enquiry history ordered by newest first
enquirySchema.index({ userId: 1, createdAt: -1 });

// Index for querying enquiries for a specific product
enquirySchema.index({ productId: 1 });

// Compound index for administrative filtering/sorting by status and creation date
enquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
