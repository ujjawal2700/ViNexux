import { createHash, randomBytes, randomInt } from 'node:crypto';
import { CctvQuote, CctvQuoteSettings, QuoteEmailVerification } from '../models/CctvQuote.js';
import { getQuoteCatalog } from './cctvQuoteCatalog.service.js';
import { calculateCctvQuote } from '../../../shared/cctvQuote.js';
import { POS_SELLER_DEFAULTS } from '../../../shared/posBilling.js';
import { emailService } from './email/email.service.js';
import { generateCctvQuotePdf } from './cctvQuotePdf.service.js';
import { adminArrivalService } from './adminArrival.service.js';
import { pushService } from './push/push.service.js';
import { AppError } from '../utils/AppError.js';
const hash = value => createHash('sha256').update(value).digest('hex');
export const DEFAULT_QUOTE_SETTINGS = { enabled: true, areas: ['Kota City', 'Kota Surrounding Areas', 'Outside Kota'], installationPerCamera: 0, gstRate: 18, validityDays: 7, terms: 'Prices and availability are subject to confirmation. Installation, cabling and travel are excluded unless itemized. Our team will confirm compatibility and final requirements after a call or site visit.', seller: Object.fromEntries(['name', 'address', 'state', 'gstin', 'email', 'phone'].map(key => [key, POS_SELLER_DEFAULTS[key] || ''])), mappings: [], revision: 0 };
export async function getCctvQuoteSettings() { const row = await CctvQuoteSettings.findOne({ singletonKey: 'primary' }).lean(); return { ...DEFAULT_QUOTE_SETTINGS, ...row, seller: { ...DEFAULT_QUOTE_SETTINGS.seller, ...row?.seller }, mappings: row?.mappings || [] }; }
export async function saveCctvQuoteSettings(data) {
  // Create the singleton once; edits use compare-and-swap to reject stale forms.
  await CctvQuoteSettings.updateOne({ singletonKey: 'primary' }, { $setOnInsert: { ...DEFAULT_QUOTE_SETTINGS, singletonKey: 'primary' } }, { upsert: true });
  const { revision, ...fields } = data;
  const saved = await CctvQuoteSettings.findOneAndUpdate({ singletonKey: 'primary', revision }, { $set: fields, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean();
  if (!saved) throw new AppError('Quotation settings changed. Reload before saving.', 409, 'CONFLICT');
  return saved;
}
export async function quoteCatalogResponse(user, admin = false) {
  const settings = await getCctvQuoteSettings();
  return { settings: admin ? settings : Object.fromEntries(['enabled', 'areas', 'installationPerCamera', 'gstRate', 'validityDays', 'terms', 'seller'].map(key => [key, settings[key]])), catalog: settings.enabled || admin ? await getQuoteCatalog(user, settings, { admin }) : [], pricesVisible: !!user };
}
export async function sendQuoteEmailCode(user, email) {
  if (user.isEmailVerified && user.email?.toLowerCase() === email) return { alreadyVerified: true };
  const code = String(randomInt(100000, 1000000)), now = new Date();
  let record;
  try { record = await QuoteEmailVerification.findOneAndUpdate({ userId: user._id, email, $or: [{ sentAt: { $lte: new Date(+now - 60000) } }, { sentAt: { $exists: false } }] }, { $set: { codeHash: hash(code), tokenHash: '', attempts: 0, sentAt: now, expiresAt: new Date(+now + 5 * 60000) } }, { new: true, upsert: true }); }
  catch (error) { if (error.code === 11000) throw new AppError('Wait 60 seconds before requesting another code.', 429, 'RATE_LIMITED'); throw error; }
  try { await emailService.sendOtpEmail({ email, otp: code, purpose: 'quotation email verification' }); }
  catch (error) { await QuoteEmailVerification.deleteOne({ _id: record._id, codeHash: hash(code) }); throw error; }
  return { resendAfter: 60 };
}
export async function verifyQuoteEmailCode(user, email, code) {
  const record = await QuoteEmailVerification.findOneAndUpdate({ userId: user._id, email, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() }, codeHash: { $ne: '' } }, { $inc: { attempts: 1 } }, { new: true });
  if (!record || record.codeHash !== hash(code)) throw new AppError('Invalid or expired code. Request a new code if needed.', 400, 'VALIDATION_ERROR');
  const token = randomBytes(32).toString('hex');
  const verified = await QuoteEmailVerification.updateOne({ _id: record._id, codeHash: record.codeHash }, { $set: { codeHash: '', tokenHash: hash(token), expiresAt: new Date(Date.now() + 15 * 60000) } });
  if (!verified.modifiedCount) throw new AppError('Code already used. Request a new code.', 409, 'CONFLICT');
  return { token };
}
export async function assertQuoteEmail(user, email, token) {
  if (user.isEmailVerified && user.email?.toLowerCase() === email) return;
  if (!token || !await QuoteEmailVerification.exists({ userId: user._id, email, tokenHash: hash(token), expiresAt: { $gt: new Date() } })) throw new AppError('Verify the quotation email before submitting.', 400, 'EMAIL_VERIFICATION_REQUIRED');
}
export async function findCctvQuote(id, user, admin = false) {
  const quote = await CctvQuote.findOne({ _id: id, ...(admin ? {} : { userId: user._id }) });
  if (!quote) throw new AppError('Quotation not found.', 404, 'NOT_FOUND');
  return quote;
}
export async function emailCctvQuote(quote) {
  try {
    const pdf = await generateCctvQuotePdf(quote);
    const result = await emailService.sendEmail({ to: quote.customer.email, subject: `ViNexus CCTV quotation ${quote.quoteNumber}`, text: `Hello ${quote.customer.name},\n\nYour CCTV quotation ${quote.quoteNumber} is attached. ${quote.pricing.priced ? 'Prices and availability are subject to confirmation.' : 'Our team will confirm pricing and availability.'}\n\nViNexus`, attachments: [{ filename: `${quote.quoteNumber}.pdf`, content: pdf, contentType: 'application/pdf' }] });
    quote.emailStatus = result.success ? ['development', 'dev', 'simulated'].includes(result.provider) ? 'simulated' : 'sent' : 'failed';
  } catch { quote.emailStatus = 'failed'; }
  await CctvQuote.updateOne({ _id: quote._id }, { $set: { emailStatus: quote.emailStatus } });
  return quote.emailStatus;
}
export async function createCctvQuote(user, data) {
  const existing = await CctvQuote.findOne({ userId: user._id, requestId: data.requestId });
  if (existing) return existing;
  await assertQuoteEmail(user, data.customer.email, data.emailToken);
  const settings = await getCctvQuoteSettings();
  if (!settings.enabled) throw new AppError('Quick quotations are currently unavailable. Please contact our team.', 409, 'CONFLICT');
  if (!settings.areas.includes(data.selection.area)) throw new AppError('Choose an available service area.', 400, 'VALIDATION_ERROR');
  const catalog = await getQuoteCatalog(user, settings);
  const pricing = calculateCctvQuote(catalog, data.selection, settings);
  if (pricing.issues.length) throw new AppError(pricing.issues.join(' '), 400, 'VALIDATION_ERROR');
  const customer = { ...data.customer, gstin: data.customer.hasGst ? data.customer.gstin : '' };
  let quote;
  try { quote = await CctvQuote.create({ quoteNumber: `VNQ-${new Date().getFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`, userId: user._id, requestId: data.requestId, selection: data.selection, customer, pricing, seller: settings.seller, terms: settings.terms, expiresAt: new Date(Date.now() + settings.validityDays * 86400000) }); }
  catch (error) { if (error.code === 11000) { const saved = await CctvQuote.findOne({ userId: user._id, requestId: data.requestId }); if (saved) return saved; } throw error; }
  await adminArrivalService.publish({ _id: quote._id, quoteNumber: quote.quoteNumber, contactName: customer.name }, 'quotation');
  await emailCctvQuote(quote);
  return quote;
}
export async function updateCctvQuote(quote, data, admin) {
  if (quote.__v !== data.expectedVersion) throw new AppError('Quotation changed. Reload before saving.', 409, 'CONFLICT');
  if (data.lines) {
    quote.revisions.push({ pricing: quote.pricing, at: new Date(), adminId: admin._id });
    const lines = data.lines.map((line, index) => ({ ...line, key: `manual-${index}`, amount: Math.round(line.quantity * line.unitPrice * 100) / 100 }));
    const subtotal = lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0), tax = lines.reduce((sum, line) => sum + Math.round(line.amount * quote.pricing.gstRate), 0), total = Math.round((subtotal + tax) / 100) * 100;
    const interstate = quote.selection.state.toLowerCase() !== quote.seller.state.toLowerCase();
    quote.pricing = { ...quote.pricing, lines, priced: true, reasons: [], issues: [], subtotal: subtotal / 100, cgst: interstate ? 0 : Math.round(tax / 2) / 100, sgst: interstate ? 0 : (tax - Math.round(tax / 2)) / 100, igst: interstate ? tax / 100 : 0, roundOff: (total - subtotal - tax) / 100, total: total / 100 };
  }
  quote.status = data.status;
  if (data.response) quote.messages.push({ from: 'admin', text: data.response, at: new Date() });
  if (quote.revisions.length > 50 || quote.messages.length > 200) throw new AppError('Conversation / revision limit reached.', 400, 'VALIDATION_ERROR');
  await quote.save();
  if (data.response) await pushService.sendToUser(quote.userId, { title: 'Your CCTV quotation has a response', body: quote.quoteNumber, data: { type: 'quotation-response', quotationId: String(quote._id), replyCount: String(quote.messages.length), link: `/account/quotations/${quote._id}` } }).catch(() => {});
  return quote;
}
