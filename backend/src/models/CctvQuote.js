import mongoose from 'mongoose';
import '../audit/audit.js';
const schema = new mongoose.Schema({
  quoteNumber: { type: String, required: true, unique: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestId: { type: String, required: true }, selection: { type: Object, required: true }, customer: { type: Object, required: true },
  pricing: { type: Object, required: true }, terms: { type: String, required: true }, seller: { type: Object, required: true }, expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['new', 'processing', 'responded', 'closed'], default: 'new' },
  messages: { type: [{ from: { type: String, enum: ['admin', 'customer'] }, text: String, at: { type: Date, default: Date.now } }], default: [] },
  revisions: { type: [{ pricing: Object, at: Date, adminId: mongoose.Schema.Types.ObjectId }], default: [] },
  emailStatus: { type: String, enum: ['not-sent', 'sent', 'simulated', 'failed'], default: 'not-sent' },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ userId: 1, requestId: 1 }, { unique: true });
schema.index({ status: 1, createdAt: -1 });
export const CctvQuote = mongoose.model('CctvQuote', schema);
const settings = new mongoose.Schema({ singletonKey: { type: String, unique: true, default: 'primary' }, enabled: Boolean, areas: [String], seller: Object, installationPerCamera: Number, gstRate: Number, validityDays: Number, terms: String, mappings: [Object], revision: { type: Number, default: 0 } }, { timestamps: true });
export const CctvQuoteSettings = mongoose.model('CctvQuoteSettings', settings);
const verification = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true }, email: String, codeHash: String, tokenHash: String, attempts: { type: Number, default: 0 }, sentAt: Date, expiresAt: Date }, { timestamps: true });
verification.index({ userId: 1, email: 1 }, { unique: true });
verification.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const QuoteEmailVerification = mongoose.model('QuoteEmailVerification', verification);
