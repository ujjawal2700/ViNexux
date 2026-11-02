import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import routes from '../../backend/src/routes/adminProduct.routes.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
import { productSheetService } from '../../backend/src/services/googleSheets/productSheet.service.js';
import { productService } from '../../backend/src/services/product.service.js';
import { User } from '../../backend/src/models/User.js';
import { Session } from '../../backend/src/models/Session.js';
import { generateAccessToken } from '../../backend/src/utils/token.util.js';
const id = '507f1f77bcf86cd799439011';
let request, token;
beforeEach(() => {
  const app = express(); app.use(express.json()); app.use('/api/admin/products', routes); app.use(errorHandler); request = supertest(app);
  token = generateAccessToken({ userId: id, sessionId: 'admin-session', role: 'admin' });
  jest.spyOn(Session, 'findOne').mockResolvedValue({ sessionId: 'admin-session', userType: 'admin', isActive: true, lastActiveAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: id, fullName: 'Admin', role: 'admin', accountStatus: 'active' });
});
afterEach(() => jest.restoreAllMocks());

test('product sheet endpoints require an authenticated admin', async () => {
  const sync = jest.spyOn(productSheetService, 'sync');
  expect((await request.get('/api/admin/products/google-sheet')).status).toBe(401);
  expect((await request.post('/api/admin/products/google-sheet/sync').send({})).status).toBe(401);
  User.findById.mockResolvedValue({ _id: id, role: 'customer', accountStatus: 'active' });
  expect((await request.post('/api/admin/products/google-sheet/sync').auth(token, { type: 'bearer' }).send({})).status).toBe(403);
  expect(sync).not.toHaveBeenCalled();
});

test('status is routed ahead of product IDs and does not query a product named google-sheet', async () => {
  const status = jest.spyOn(productSheetService, 'status').mockResolvedValue({ configured: false, connected: false });
  const get = jest.spyOn(productService, 'getProductById');
  const result = await request.get('/api/admin/products/google-sheet').auth(token, { type: 'bearer' });
  expect(result.status).toBe(200); expect(result.body.data.connected).toBe(false);
  expect(status).toHaveBeenCalled(); expect(get).not.toHaveBeenCalled();
});

test('initialization validates request types and passes only the spreadsheet target', async () => {
  const initialize = jest.spyOn(productSheetService, 'initialize').mockResolvedValue({ connected: true });
  const bad = await request.post('/api/admin/products/google-sheet/initialize').auth(token, { type: 'bearer' }).send({ spreadsheetUrl: [] });
  expect(bad.status).toBe(400); expect(initialize).not.toHaveBeenCalled();
  const result = await request.post('/api/admin/products/google-sheet/initialize').auth(token, { type: 'bearer' }).send({ spreadsheetUrl: 'spreadsheet-target-123456789', products: [{ fake: true }] });
  expect(result.status).toBe(200); expect(initialize).toHaveBeenCalledWith('spreadsheet-target-123456789');
});

test('sync obtains rows on the server and attributes changes to the authenticated admin', async () => {
  const sync = jest.spyOn(productSheetService, 'sync').mockResolvedValue({ result: { updated: 2, created: 1, failed: 0 } });
  const result = await request.post('/api/admin/products/google-sheet/sync').auth(token, { type: 'bearer' }).send({ actor: { _id: 'spoofed' }, products: [] });
  expect(result.status).toBe(200); expect(result.body.data.result.created).toBe(1);
  expect(sync).toHaveBeenCalledWith(expect.objectContaining({ _id: id, fullName: 'Admin' }));
});
