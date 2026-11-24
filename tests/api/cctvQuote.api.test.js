import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import { cctvQuoteRoutes, adminCctvQuoteRoutes } from '../../backend/src/routes/cctvQuote.routes.js';
import { CctvQuote, CctvQuoteSettings, QuoteEmailVerification } from '../../backend/src/models/CctvQuote.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
import { User } from '../../backend/src/models/User.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { DealerPricing } from '../../backend/src/models/DealerPricing.js';
import { DealerPricingSettings } from '../../backend/src/models/DealerPricingSettings.js';
import { Session } from '../../backend/src/models/Session.js';
import { generateAccessToken } from '../../backend/src/utils/token.util.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
import { invalidateCategoryCache } from '../../backend/src/utils/categoryCache.js';
import { emailService } from '../../backend/src/services/email/email.service.js';
import { adminArrivalService } from '../../backend/src/services/adminArrival.service.js';
import { pushService } from '../../backend/src/services/push/push.service.js';
import { cctvCatalog, ids, quoteSelectionFixture as selection, quoteCustomerFixture as customer, quoteSettingsFixture } from '../fixtures/cctvQuote.js';
const userId = '607f1f77bcf86cd799439011', otherId = '607f1f77bcf86cd799439012';
let request, user, records, products, settings;
const chain = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
const auth = () => `Bearer ${generateAccessToken({ userId: String(user._id), sessionId: 'quote-session', role: user.role })}`;
const payload = () => ({ selection, customer, requestId: 'quote-test-request-12345' });
const matches = (row, query) => Object.entries(query).every(([key, value]) => String(row[key]) === String(value));
beforeEach(() => {
  invalidateCategoryCache(); records = [];
  user = { _id: userId, role: 'customer', fullName: customer.name, email: customer.email, isEmailVerified: true, accountStatus: 'active' };
  products = cctvCatalog.map(row => ({ _id: row.productId, name: row.name, sku: row.sku, modelNumber: row.modelNumber, standardPrice: row.price, dealerPrice: row.price * .8, stockQuantity: row.stock, brandId: { name: row.brand, isActive: true }, categoryId: ids[0], variants: [], specifications: [], images: [] }));
  settings = { ...quoteSettingsFixture, mappings: cctvCatalog.map(row => ({ productId: row.productId, variantId: null, kind: row.kind, systemTypes: row.systemTypes, style: row.style, capacity: row.capacity, recommended: false, excluded: false })) };
  jest.spyOn(Session, 'findOne').mockResolvedValue({ sessionId: 'quote-session', userType: 'customer', isActive: true, lastActiveAt: new Date(), expiresAt: new Date(Date.now() + 3600000) });
  jest.spyOn(User, 'findById').mockImplementation(() => chain(user));
  jest.spyOn(Category, 'find').mockReturnValue(chain([{ _id: ids[0], name: 'CCTV', isActive: true, parentId: null }]));
  jest.spyOn(Product, 'find').mockImplementation(() => chain(products));
  jest.spyOn(DealerProfile, 'findOne').mockReturnValue(chain({ _id: ids[1], status: 'approved', organisationType: 'Installer' }));
  jest.spyOn(DealerPricing, 'find').mockReturnValue(chain([]));
  jest.spyOn(DealerPricingSettings, 'findById').mockReturnValue(chain({ installerPriceIncreasePercent: 10 }));
  jest.spyOn(CctvQuoteSettings, 'findOne').mockImplementation(() => chain(settings));
  jest.spyOn(CctvQuoteSettings, 'updateOne').mockResolvedValue({});
  jest.spyOn(CctvQuoteSettings, 'findOneAndUpdate').mockImplementation((filter, update) => { if (filter.revision !== settings.revision) return chain(null); settings = { ...settings, ...update.$set, revision: settings.revision + 1 }; return chain(settings); });
  jest.spyOn(CctvQuote, 'findOne').mockImplementation(async query => records.find(row => matches(row, query)) || null);
  jest.spyOn(CctvQuote, 'find').mockImplementation(query => chain(records.filter(row => !query.userId || String(row.userId) === String(query.userId))));
  jest.spyOn(CctvQuote, 'countDocuments').mockImplementation(async query => records.filter(row => !query.userId || String(row.userId) === String(query.userId)).length);
  jest.spyOn(CctvQuote, 'create').mockImplementation(async input => { const quote = new CctvQuote({ ...input, createdAt: new Date(), __v: 0 }); await quote.validate(); records.push(quote); return quote; });
  jest.spyOn(CctvQuote.prototype, 'save').mockImplementation(async function () { await this.validate(); this.__v += 1; return this; });
  jest.spyOn(CctvQuote, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
  jest.spyOn(QuoteEmailVerification, 'exists').mockResolvedValue(null);
  jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true, provider: 'smtp' });
  jest.spyOn(adminArrivalService, 'publish').mockResolvedValue(undefined);
  jest.spyOn(pushService, 'sendToUser').mockResolvedValue({ success: true });
  const app = express(); app.use(express.json()); app.use('/api/quotations', cctvQuoteRoutes); app.use('/api/admin/quotations', adminCctvQuoteRoutes); app.use(errorHandler); request = supertest(app);
});
afterEach(() => { invalidateCategoryCache(); jest.restoreAllMocks(); });

test('guests can configure without price leakage, but cannot save or read private quotations', async () => {
  const res = await request.get('/api/quotations/catalog');
  expect(res.status).toBe(200); expect(res.headers['cache-control']).toContain('no-store');
  expect(res.body.data.pricesVisible).toBe(false); expect(res.body.data.catalog).toHaveLength(cctvCatalog.length);
  for (const row of res.body.data.catalog) { expect(row.price).toBeUndefined(); expect(row.dealerPrice).toBeUndefined(); }
  expect((await request.post('/api/quotations').send(payload())).status).toBe(401);
  expect((await request.get(`/api/quotations/${ids[0]}/pdf`)).status).toBe(401);
});
test('prices are recomputed server-side, saved as snapshots, emailed as a PDF and notified once', async () => {
  const response = await request.post('/api/quotations').set('Authorization', auth()).send(payload());
  expect(response.status).toBe(200); expect(response.body.data.quote.pricing.total).toBe(17134); expect(response.body.data.quote.emailStatus).toBe('sent');
  expect(emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: customer.email, attachments: [expect.objectContaining({ contentType: 'application/pdf', content: expect.any(Buffer) })] }));
  expect(emailService.sendEmail.mock.calls[0][0].attachments[0].content.subarray(0, 4).toString()).toBe('%PDF');
  expect(adminArrivalService.publish).toHaveBeenCalledWith(expect.objectContaining({ quoteNumber: expect.stringContaining('VNQ-') }), 'quotation');
  products[0].standardPrice = 999999;
  const retry = await request.post('/api/quotations').set('Authorization', auth()).send(payload());
  expect(retry.body.data.quote._id).toBe(response.body.data.quote._id); expect(retry.body.data.quote.pricing.total).toBe(17134);
  expect(CctvQuote.create).toHaveBeenCalledTimes(1); expect(adminArrivalService.publish).toHaveBeenCalledTimes(1);
});
test('approved installers receive the live installer increase over dealer prices', async () => {
  user.role = 'dealer';
  const response = await request.get('/api/quotations/catalog').set('Authorization', auth());
  expect(response.status).toBe(200);
  expect(response.body.data.catalog.find(row => row.key === ids[0]).price).toBe(Math.round(2599 * .8 * 110) / 100);
});
test('unknown products and client totals are rejected; insufficient stock creates a manual quote', async () => {
  expect((await request.post('/api/quotations').set('Authorization', auth()).send({ ...payload(), total: 1 })).status).toBe(400);
  expect((await request.post('/api/quotations').set('Authorization', auth()).send({ ...payload(), selection: { ...selection, domeKey: ids[2] } })).status).toBe(400);
  products[0].stockQuantity = 0;
  const result = await request.post('/api/quotations').set('Authorization', auth()).send(payload());
  expect(result.status).toBe(200); expect(result.body.data.quote.pricing.priced).toBe(false); expect(result.body.data.quote.pricing.total).toBeNull();
});
test('owner-only access protects saved quotations, PDF downloads and emails', async () => {
  const created = await request.post('/api/quotations').set('Authorization', auth()).send(payload()); const id = created.body.data.quote._id;
  const pdf = await request.get(`/api/quotations/${id}/pdf`).set('Authorization', auth()); expect(pdf.status).toBe(200); expect(pdf.headers['content-type']).toContain('application/pdf');
  user._id = otherId;
  for (const path of [`/${id}`, `/${id}/pdf`]) expect((await request.get(`/api/quotations${path}`).set('Authorization', auth())).status).toBe(404);
  expect((await request.post(`/api/quotations/${id}/email`).set('Authorization', auth())).status).toBe(404);
  expect((await request.get('/api/quotations').set('Authorization', auth())).body.data.quotes).toEqual([]);
});
test('unverified or changed email cannot receive a quotation without a matching verification token', async () => {
  user.isEmailVerified = false;
  expect((await request.post('/api/quotations').set('Authorization', auth()).send(payload())).status).toBe(400);
  QuoteEmailVerification.exists.mockResolvedValue({ _id: ids[1] });
  expect((await request.post('/api/quotations').set('Authorization', auth()).send({ ...payload(), emailToken: 'verified-token-for-user-and-email' })).status).toBe(200);
  expect(QuoteEmailVerification.exists).toHaveBeenLastCalledWith(expect.objectContaining({ userId, email: customer.email, tokenHash: expect.any(String) }));
});
test('failed email delivery keeps the saved quote available for PDF download', async () => {
  emailService.sendEmail.mockRejectedValue(new Error('SMTP unavailable'));
  const result = await request.post('/api/quotations').set('Authorization', auth()).send(payload());
  expect(result.status).toBe(200); expect(result.body.data.quote.emailStatus).toBe('failed'); expect(records).toHaveLength(1);
});
test('admin can follow up, issue a manually revised quotation, and reject stale edits', async () => {
  const created = await request.post('/api/quotations').set('Authorization', auth()).send(payload()); const id = created.body.data.quote._id;
  expect((await request.get('/api/admin/quotations').set('Authorization', auth())).status).toBe(403);
  user.role = 'admin';
  const response = await request.put(`/api/admin/quotations/${id}`).set('Authorization', auth()).send({ expectedVersion: 0, status: 'responded', response: 'Confirmed after survey.', lines: [{ name: 'Surveyed CCTV package', quantity: 1, unitPrice: 10000 }] });
  expect(response.status).toBe(200); expect(response.body.data.quote.pricing.total).toBe(11800); expect(response.body.data.quote.revisions).toHaveLength(1); expect(response.body.data.quote.messages[0].text).toContain('Confirmed'); expect(pushService.sendToUser).toHaveBeenCalled();
  expect((await request.put(`/api/admin/quotations/${id}`).set('Authorization', auth()).send({ expectedVersion: 0, status: 'closed' })).status).toBe(409);
});
test('settings require an admin, validate mappings and reject concurrent edits', async () => {
  expect((await request.get('/api/admin/quotations/settings').set('Authorization', auth())).status).toBe(403);
  user.role = 'admin';
  expect((await request.put('/api/admin/quotations/settings').set('Authorization', auth()).send({ ...settings, installationPerCamera: -1 })).status).toBe(400);
  expect((await request.put('/api/admin/quotations/settings').set('Authorization', auth()).send({ ...settings, installationPerCamera: 100 })).status).toBe(200);
  expect(settings.revision).toBe(1);
  expect((await request.put('/api/admin/quotations/settings').set('Authorization', auth()).send({ ...settings, revision: 0 })).status).toBe(409);
});

test('email codes are time-limited, attempt-limited, and replaced with a user-bound verification token', async () => {
  user.isEmailVerified = false;
  let sentCode, record;
  jest.spyOn(emailService, 'sendOtpEmail').mockImplementation(async data => { sentCode = data.otp; return { success: true }; });
  jest.spyOn(QuoteEmailVerification, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
    if (update.$set) {
      if (record?.sentAt && Date.now() - +record.sentAt < 60000) throw Object.assign(new Error('duplicate'), { code: 11000 });
      record = { _id: ids[1], userId, email: customer.email, ...update.$set }; return record;
    }
    if (!record || record.attempts >= 5 || +record.expiresAt <= Date.now() || !record.codeHash) return null;
    record.attempts++; return { ...record };
  });
  jest.spyOn(QuoteEmailVerification, 'updateOne').mockImplementation(async (filter, update) => {
    if (record?.codeHash !== filter.codeHash) return { modifiedCount: 0 };
    Object.assign(record, update.$set); return { modifiedCount: 1 };
  });
  expect((await request.post('/api/quotations/email-code').set('Authorization', auth()).send({ email: customer.email })).status).toBe(200);
  expect(sentCode).toMatch(/^\d{6}$/); expect(record.codeHash).not.toBe(sentCode);
  expect((await request.post('/api/quotations/email-code').set('Authorization', auth()).send({ email: customer.email })).status).toBe(429);
  expect((await request.post('/api/quotations/verify-email').set('Authorization', auth()).send({ email: customer.email, code: sentCode === '111111' ? '222222' : '111111' })).status).toBe(400);
  const verified = await request.post('/api/quotations/verify-email').set('Authorization', auth()).send({ email: customer.email, code: sentCode });
  expect(verified.status).toBe(200); expect(verified.body.data.token).toHaveLength(64); expect(record.codeHash).toBe(''); expect(record.tokenHash).not.toBe(verified.body.data.token);
  expect((await request.post('/api/quotations/verify-email').set('Authorization', auth()).send({ email: customer.email, code: sentCode })).status).toBe(400);
});

test('wrong camera mappings cannot expose a UPS or memory card as a camera or save them as camera lines', async () => {
  products[0].name = 'FYBER Mini UPS (Li-Ion)';
  settings.mappings[1] = { ...settings.mappings[1], kind: 'camera', style: 'dome', systemTypes: ['WIFI', '4G'] };
  const catalogResponse = await request.get('/api/quotations/catalog').set('Authorization', auth());
  expect(catalogResponse.status).toBe(200);
  expect(catalogResponse.body.data.catalog.some(row => row.productId === ids[0])).toBe(false);
  expect(catalogResponse.body.data.catalog.find(row => row.productId === ids[1]).kind).toBe('memory');
  const forged = await request.post('/api/quotations').set('Authorization', auth()).send({ ...payload(), selection: { ...selection, domeKey: ids[0] } });
  expect(forged.status).toBe(400);
  const manual = await request.post('/api/quotations').set('Authorization', auth()).send(payload());
  expect(manual.status).toBe(200);
  expect(manual.body.data.quote.pricing.priced).toBe(false);
  expect(manual.body.data.quote.pricing.lines.some(line => line.name.includes('UPS'))).toBe(false);
});
