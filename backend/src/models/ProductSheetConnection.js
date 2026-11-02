import '../audit/audit.js';
import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'products', unique: true },
  spreadsheetId: String,
  sheetId: Number,
  sheetTitle: String,
  referenceTitle: String,
  guideTitle: String,
  referenceSheetId: Number,
  guideSheetId: Number,
  initializedAt: Date,
  lastSyncedAt: Date,
  lastResult: mongoose.Schema.Types.Mixed,
  lockToken: String,
  lockUntil: Date,
}, { timestamps: true });
const recordSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', unique: true, required: true },
  baseline: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
export const ProductSheetConnection = mongoose.model('ProductSheetConnection', connectionSchema);
export const ProductSheetRecord = mongoose.model('ProductSheetRecord', recordSchema);
