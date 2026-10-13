import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import posRoutes from '../../backend/src/routes/pos.routes.js';
import publicPosRoutes from '../../backend/src/routes/publicPos.routes.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
import { posService } from '../../backend/src/services/pos.service.js';
import { posCustomerService } from '../../backend/src/services/posCustomer.service.js';
import { customerInvoiceService } from '../../backend/src/services/customerInvoice.service.js';
import { AppError } from '../../backend/src/utils/AppError.js';
import { User } from '../../backend/src/models/User.js';
import { Session } from '../../backend/src/models/Session.js';
import { generateAccessToken } from '../../backend/src/utils/token.util.js';
import { posAdminId, posInput, posInvoiceFixture } from '../helpers/posFixture.js';

let request, adminToken, customerToken;
beforeEach(() => {
  const app = express(); app.use(express.json()); app.use('/api/admin/pos', posRoutes); app.use('/api/pos', publicPosRoutes); app.use(errorHandler);
  request = supertest(app);
  adminToken = generateAccessToken({ userId: posAdminId, sessionId: 'admin-session', role: 'admin' });
  customerToken = generateAccessToken({ userId: '507f1f77bcf86cd799439025', sessionId: 'customer-session', role: 'customer' });
  jest.spyOn(Session, 'findOne').mockImplementation(async query => ({ sessionId: query.sessionId, userType: 'admin', isActive: true, lastActiveAt: new Date(), expiresAt: new Date(Date.now() + 86400000) }));
  jest.spyOn(User, 'findById').mockImplementation(async id => ({ _id: id, role: id === posAdminId ? 'admin' : 'customer', accountStatus: 'active' }));
});
afterEach(() => jest.restoreAllMocks());

describe('POS API access and output contracts', () => {
  test('customer history requires authentication and passes the server account to its ownership filter', async () => {
    const list = jest.spyOn(customerInvoiceService, 'list').mockResolvedValue({ invoices: [], total: 0, page: 1, pages: 0 });
    expect((await request.get('/api/pos/my-invoices')).status).toBe(401);
    expect((await request.get('/api/pos/my-invoices').auth(adminToken, { type: 'bearer' })).status).toBe(403);
    const result = await request.get('/api/pos/my-invoices?phone=another-customer&page=2').auth(customerToken, { type: 'bearer' });
    expect(result.status).toBe(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ _id: '507f1f77bcf86cd799439025' }), { page: 2 });
  });
  test('customer PDF retrieval enforces ownership and returns a downloadable PDF', async () => {
    const fixture = posInvoiceFixture();
    const get = jest.spyOn(customerInvoiceService, 'get').mockRejectedValueOnce(new AppError('Invoice not found for your account.', 404));
    expect((await request.get(`/api/pos/my-invoices/${fixture._id}/pdf`)).status).toBe(401);
    expect((await request.get(`/api/pos/my-invoices/${fixture._id}/pdf`).auth(customerToken, { type: 'bearer' })).status).toBe(404);
    get.mockResolvedValueOnce(fixture);
    const result = await request.get(`/api/pos/my-invoices/${fixture._id}/pdf`).auth(customerToken, { type: 'bearer' });
    expect(result.status).toBe(200); expect(result.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(get).toHaveBeenCalledWith(expect.objectContaining({ _id: '507f1f77bcf86cd799439025' }), fixture._id);
  });
  test.each(['/settings', '/products', '/customers', '/customer?phone=9876543210', '/held', '/sales', '/sales/export'])('rejects anonymous and customer access to %s', async path => {
    expect((await request.get(`/api/admin/pos${path}`)).status).toBe(401);
    expect((await request.get(`/api/admin/pos${path}`).auth(customerToken, { type: 'bearer' })).status).toBe(403);
  });
  test('validates create-sale inputs and discards client-supplied totals and seller details', async () => {
    const create = jest.spyOn(posService, 'createSale').mockResolvedValue(posInvoiceFixture());
    const bad = posInput(); bad.items[0].quantity = -1;
    expect((await request.post('/api/admin/pos/sales').auth(adminToken, { type: 'bearer' }).send(bad)).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
    const valid = posInput();
    const result = await request.post('/api/admin/pos/sales').auth(adminToken, { type: 'bearer' }).send({ ...valid, total: 0.01, seller: { name: 'fake' } });
    expect(result.status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ requestId: valid.requestId }), posAdminId);
    expect(create.mock.calls[0][0].total).toBeUndefined(); expect(create.mock.calls[0][0].seller).toBeUndefined();
  });
  test('rejects invalid calendar date filters before querying the sales register', async () => {
    const list = jest.spyOn(posService, 'listSales');
    const result = await request.get('/api/admin/pos/sales?from=2026-02-31').auth(adminToken, { type: 'bearer' });
    expect(result.status).toBe(400); expect(list).not.toHaveBeenCalled();
  });
  test('authenticated invoice endpoint returns a real PDF', async () => {
    const invoice = posInvoiceFixture(); jest.spyOn(posService, 'getSale').mockResolvedValue(invoice);
    const result = await request.get(`/api/admin/pos/sales/${invoice._id}/invoice`).auth(adminToken, { type: 'bearer' });
    expect(result.status).toBe(200); expect(result.headers['content-type']).toContain('application/pdf');
    expect(result.body.subarray(0, 5).toString()).toBe('%PDF-');
  });
  test('shared invoice links expose only the PDF and disable caching / indexing', async () => {
    const fixture = posInvoiceFixture();
    jest.spyOn(posService, 'getSharedSale').mockResolvedValue(fixture);
    const result = await request.get(`/api/pos/invoices/${'a'.repeat(64)}`);
    expect(result.status).toBe(200); expect(result.headers['content-type']).toContain('application/pdf');
    expect(result.headers['cache-control']).toBe('private, no-store'); expect(result.headers['x-robots-tag']).toContain('noindex');
  });
  test('malformed public invoice tokens fail without database access', async () => {
    expect((await request.get('/api/pos/invoices/guess')).status).toBe(404);
  });
  test('Excel export returns a downloadable XLSX for the requested filters', async () => {
    const exporter = jest.spyOn(posService, 'exportSales').mockResolvedValue([posInvoiceFixture()]);
    const result = await request.get('/api/admin/pos/sales/export?from=2026-10-01&to=2026-10-13').auth(adminToken, { type: 'bearer' });
    expect(result.status).toBe(200); expect(result.headers['content-type']).toContain('spreadsheetml');
    expect(result.headers['content-disposition']).toContain('vinexus-offline-sales.xlsx');
    expect(exporter).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-10-01', to: '2026-10-13' }));
  });
  test('OTP endpoints require an admin and validate the verification code', async () => {
    const send = jest.spyOn(posCustomerService, 'sendOtp').mockResolvedValue({ phone: '9876543210' });
    const verify = jest.spyOn(posCustomerService, 'verifyOtp').mockResolvedValue({ verified: true });
    expect((await request.post('/api/admin/pos/customer/otp').send({ phone: '9876543210' })).status).toBe(401);
    expect((await request.post('/api/admin/pos/customer/otp').auth(customerToken, { type: 'bearer' }).send({ phone: '9876543210' })).status).toBe(403);
    expect((await request.post('/api/admin/pos/customer/otp').auth(adminToken, { type: 'bearer' }).send({ phone: '9876543210' })).status).toBe(200);
    expect(send).toHaveBeenCalledWith('9876543210', posAdminId);
    expect((await request.post('/api/admin/pos/customer/verify').auth(adminToken, { type: 'bearer' }).send({ phone: '9876543210', otp: 'bad' })).status).toBe(400);
    expect(verify).not.toHaveBeenCalled();
    expect((await request.post('/api/admin/pos/customer/verify').auth(adminToken, { type: 'bearer' }).send({ phone: '9876543210', otp: '123456' })).status).toBe(200);
    expect(verify).toHaveBeenCalledWith('9876543210', '123456', posAdminId);
  });
  test('customer persistence rejects unverified new phones and returns saved details for valid requests', async () => {
    const save = jest.spyOn(posCustomerService, 'save').mockRejectedValueOnce(new AppError('Verify the new customer phone number by OTP before saving.', 403));
    const input = posInput().customer;
    expect((await request.put('/api/admin/pos/customer').auth(adminToken, { type: 'bearer' }).send(input)).status).toBe(403);
    save.mockResolvedValueOnce({ customer: input, found: true, needsVerification: false });
    const result = await request.put('/api/admin/pos/customer').auth(adminToken, { type: 'bearer' }).send(input);
    expect(result.status).toBe(200); expect(result.body.data.customer).toMatchObject(input);
  });
});
