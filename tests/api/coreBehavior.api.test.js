import { beforeAll, describe, expect, test } from '@jest/globals';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import supertest from 'supertest';

mongoose.set('bufferCommands', false);
let request;

beforeAll(async () => {
  const { default: app } = await import('../../backend/src/app.js');
  request = supertest(app);
});

describe('core API behavior', () => {
  test('root and health endpoints report the service as available', async () => {
    const [root, health] = await Promise.all([request.get('/'), request.get('/api/health')]);
    expect(root.status).toBe(200);
    expect(root.body.success).toBe(true);
    expect(health.status).toBe(200);
    expect(health.body.success).toBe(true);
    expect(health.body.data.status).toBe('UP');
  });

  test('unknown APIs use the centralized JSON 404 response', async () => {
    const response = await request.get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  test('protected customer, dealer, and admin APIs reject anonymous access', async () => {
    const responses = await Promise.all([
      request.get('/api/cart'),
      request.get('/api/dealers/profile'),
      request.get('/api/admin/dashboard'),
      request.get('/api/admin/cms/themes'),
      request.get('/api/admin/cms/banner-grid'),
      request.post('/api/admin/cms/banner-grid/0/images'),
      request.post('/api/admin/cms/themes/reset'),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    }
  });

  test('authentication and catalog validators reject malformed input', async () => {
    const [otp, product, category] = await Promise.all([
      request.post('/api/auth/send-otp').send({ identifier: 'bad', purpose: 'login' }),
      request.get('/api/products/not-an-object-id'),
      request.get('/api/categories/not-an-object-id'),
    ]);
    expect(otp.status).toBe(400);
    expect(product.status).toBe(400);
    expect(category.status).toBe(400);
  });

  test('CORS allows the configured storefront and rejects an unknown origin', async () => {
    const allowed = await request.get('/api/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const rejected = await request.get('/api/health').set('Origin', 'https://malicious.example');
    expect(rejected.status).toBeGreaterThanOrEqual(400);
  });
});
