import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
import WebsiteSettings from '../../backend/src/models/WebsiteSettings.js';
import { maintenanceGuard } from '../../backend/src/middlewares/maintenance.middleware.js';

jest.unstable_mockModule('../../backend/src/middlewares/auth.middleware.js', () => ({
  authenticate: (req, res, next) => {
    const role = req.headers['x-test-role'];
    if (!role) return res.sendStatus(401);
    req.user = { _id: '507f1f77bcf86cd799439011', role: role === 'employee' ? 'admin' : role, isEmployee: role === 'employee' };
    next();
  },
}));
const { default: maintenanceRoutes } = await import('../../backend/src/routes/maintenance.routes.js');
let settings, request;
beforeEach(() => {
  settings = { maintenanceEnabled: true, maintenanceMessage: 'We will be back after our catalogue update.' };
  jest.spyOn(WebsiteSettings, 'findOne').mockImplementation(() => ({ select: () => ({ lean: async () => settings }) }));
  jest.spyOn(WebsiteSettings, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
    if (!update.$setOnInsert) settings = { ...settings, ...update };
    return settings;
  });
  const app = express(); app.use(express.json()); app.use(maintenanceGuard);
  app.use('/admin/maintenance', maintenanceRoutes);
  app.use((req, res) => res.json({ available: true }));
  app.use(errorHandler);
  request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());

test('maintenance blocks browsing, checkout, registration and direct customer operations with 503', async () => {
  for (const path of ['/products', '/categories', '/cart', '/enquiries', '/dealers/profile', '/pos', '/auth/signup', '/auth/google']) {
    const response = await request.post(path).send({});
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('MAINTENANCE_MODE');
    expect(response.body.message).toBe(settings.maintenanceMessage);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['retry-after']).toBe('60');
  }
  expect((await request.get('/products')).status).toBe(503);
});
test('health, settings and admin sign-in remain reachable; ordinary operations resume when disabled', async () => {
  for (const path of ['/health', '/content/website-settings', '/auth/send-otp', '/auth/verify-otp', '/auth/refresh-token']) {
    expect((await request.get(path)).status).toBe(200);
  }
  settings.maintenanceEnabled = false;
  expect((await request.get('/products')).status).toBe(200);
});
test('only super admins can read or change maintenance settings', async () => {
  expect((await request.get('/admin/maintenance')).status).toBe(401);
  for (const role of ['employee', 'customer', 'dealer']) {
    expect((await request.get('/admin/maintenance').set('x-test-role', role)).status).toBe(403);
    expect((await request.put('/admin/maintenance').set('x-test-role', role).send({ maintenanceEnabled: false, maintenanceMessage: 'Closed' })).status).toBe(403);
  }
  expect((await request.get('/admin/maintenance').set('x-test-role', 'admin')).body.data.maintenanceEnabled).toBe(true);
  const response = await request.put('/admin/maintenance').set('x-test-role', 'admin')
    .send({ maintenanceEnabled: false, maintenanceMessage: 'Scheduled maintenance' });
  expect(response.status).toBe(200);
  expect(response.body.data.maintenanceEnabled).toBe(false);
  expect((await request.get('/cart')).status).toBe(200);
});
test('maintenance changes reject invalid values and unrelated settings', async () => {
  for (const body of [{ maintenanceEnabled: 'yes', maintenanceMessage: 'Closed' },
    { maintenanceEnabled: true, maintenanceMessage: ' ' },
    { maintenanceEnabled: true, maintenanceMessage: 'Closed', websiteName: 'Changed' }]) {
    expect((await request.put('/admin/maintenance').set('x-test-role', 'admin').send(body)).status).toBe(400);
  }
});
