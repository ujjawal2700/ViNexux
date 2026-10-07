import mongoose from 'mongoose';

const footerLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Link label is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Link URL is required'],
      trim: true,
    },
    iconUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Sort order cannot be negative'],
    },
  },
  { _id: false }
);

const phoneContactSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const whatsappContactSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const emailContactSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const bankAccountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      trim: true,
      default: '',
    },
    bankName: {
      type: String,
      trim: true,
      default: '',
    },
    accountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    ifscCode: {
      type: String,
      trim: true,
      default: '',
    },
    branch: {
      type: String,
      trim: true,
      default: '',
    },
    accountType: {
      type: String,
      trim: true,
      default: 'Current Account',
    },
    upiId: {
      type: String,
      trim: true,
      default: '',
    },
    qrCodeUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const footerContentSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      trim: true,
    },
    companyDescription: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: '8769959424',
    },
    whatsappMessageNote: {
      type: String,
      trim: true,
      default: 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.',
    },
    phoneNumbers: [phoneContactSchema],
    whatsappNumbers: [whatsappContactSchema],
    emails: [emailContactSchema],
    bankAccounts: [bankAccountSchema],
    bankDetailsHeading: { type: String, trim: true, default: 'Bank Details' },
    showBankDetails: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
      trim: true,
    },
    mapUrl: { type: String, trim: true },
    aboutHeading: { type: String, trim: true, default: 'About' },
    quickLinksHeading: { type: String, trim: true, default: 'Information' },
    legalLinksHeading: { type: String, trim: true, default: 'Legal' },
    contactHeading: { type: String, trim: true, default: 'Contact Us' },
    quickLinks: [footerLinkSchema],
    legalLinks: [footerLinkSchema],
    socialLinks: [footerLinkSchema],
    copyrightText: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching active footer configuration
footerContentSchema.index({ isActive: 1 });

export const FooterContent = mongoose.model('FooterContent', footerContentSchema);
export default FooterContent;
