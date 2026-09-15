import mongoose from 'mongoose';

const enquiryItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    priceShown: {
      type: Number,
      required: [true, 'Price shown snapshot is required'],
      default: 0,
      min: [0, 'Price shown cannot be negative'],
    },
  },
  { _id: false }
);

const enquiryNoteSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
    },
    note: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [1000, 'Note text cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: '' },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    enquiryNumber: {
      type: String,
      required: [true, 'Enquiry number is required'],
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    contactName: {
      type: String,
      required: [true, 'Contact name snapshot is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email snapshot is required'],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone snapshot is required'],
      trim: true,
    },
    // WhatsApp number the submitter wants to be reached on - may differ
    // from their account phone. Used to build the admin's wa.me deep link
    // (see admin enquiry pages) since there's no WhatsApp Business API
    // integration to send messages automatically.
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      default: () => ({}),
    },
    userType: {
      type: String,
      enum: ['customer', 'dealer'],
      required: [true, 'User type is required'],
    },
    items: {
      type: [enquiryItemSchema],
      required: [true, 'Enquiry items are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Enquiry must contain at least one item',
      },
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in-progress', 'closed', 'spam'],
      default: 'new',
      required: [true, 'Enquiry status is required'],
    },
    notes: {
      type: [enquiryNoteSchema],
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notifiedViaEmail: {
      type: Boolean,
      default: false,
    },
    syncedToGoogleSheet: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
enquirySchema.index({ userId: 1, createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ userType: 1 });
enquirySchema.index({ 'items.productId': 1 });

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
