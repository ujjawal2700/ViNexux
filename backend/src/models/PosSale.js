import mongoose from 'mongoose';

const payment = new mongoose.Schema({ method: String, amount: Number, reference: String, requestId: String, createdAt: Date, createdBy: mongoose.Schema.Types.ObjectId }, { _id: false });
const item = new mongoose.Schema({ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, productName: String,
  sku: String, modelNumber: String, quantity: Number, unitPrice: Number, discountPercent: Number, gstRate: Number,
  hsn: String, unit: String, serialNumbers: [String], taxable: Number, cgst: Number, sgst: Number, igst: Number,
  originalAmount: Number, discountAmount: Number, lineTotal: Number, taxableUnitRate: Number, returnedQuantity: { type: Number, default: 0 } }, { _id: false });
const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true }, requestId: { type: String, required: true, unique: true },
  shareToken: { type: String, required: true, unique: true, select: false },
  seller: { type: Object, required: true }, customer: { type: Object, required: true }, shipping: Object, delivery: Object,
  items: [item], taxGroups: [Object], taxMode: String, interstate: Boolean, roundOff: Boolean,
  itemsTotal: Number, discountTotal: Number, subtotal: Number, cgst: Number, sgst: Number, igst: Number, taxTotal: Number, roundOffAmount: Number, total: Number, totalQuantity: Number,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payments: [payment], paidAmount: { type: Number, default: 0 }, balanceDue: Number,
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], required: true },
  status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
  notes: String, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voidedAt: Date, voidedBy: mongoose.Schema.Types.ObjectId, voidReason: String,
  returns: { type: [Object], default: [] }, returnedAmount: { type: Number, default: 0 },
  refunds: { type: [Object], default: [] }, refundDue: { type: Number, default: 0 },
}, { timestamps: true });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 });
saleSchema.index({ 'customer.phone': 1 });
saleSchema.index({ customerId: 1, createdAt: -1 });
export const PosSale = mongoose.model('PosSale', saleSchema);
export const PosCounter = mongoose.model('PosCounter', new mongoose.Schema({ _id: String, sequence: { type: Number, default: 0 } }));
export const PosSettings = mongoose.model('PosSettings', new mongoose.Schema({ _id: { type: String, default: 'primary' }, seller: Object, updatedBy: mongoose.Schema.Types.ObjectId }, { timestamps: true }));
export const PosHeldBill = mongoose.model('PosHeldBill', new mongoose.Schema({ label: String, draft: Object, createdBy: mongoose.Schema.Types.ObjectId }, { timestamps: true }));
