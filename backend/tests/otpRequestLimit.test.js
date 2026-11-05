import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { config } from '../src/config/env.js';
import { MongoRateLimitStore } from '../src/utils/mongoRateLimitStore.js';

// Exercise the production middleware with a disposable in-memory store.
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
config.otpRequestMax = 2;
config.otpRequestWindowMinutes = 1;
const { otpRequestRateLimiter } = await import('../src/middlewares/rateLimiter.js');
if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = originalNodeEnv;

function setup(t) {
  const hits = new Map();
  t.mock.method(MongoRateLimitStore.prototype, 'increment', async (key) => {
    const count = (hits.get(key) || 0) + 1;
    hits.set(key, count);
    return { totalHits: count, resetTime: new Date(Date.now() + 42000) };
  });
  t.mock.method(MongoRateLimitStore.prototype, 'decrement', async (key) => {
    hits.set(key, Math.max(0, (hits.get(key) || 0) - 1));
  });
  const app = express();
  app.use(express.json());
  app.post('/otp', otpRequestRateLimiter, (req, res) => res.status(req.body.status || 200).json({}));
  return app;
}

test('enforces the configured quota with the actual remaining retry time', async (t) => {
  const app = setup(t);
  const send = () => request(app).post('/otp').send({ identifier: '9876543210' });
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  const blocked = await send();
  assert.equal(blocked.status, 429);
  assert.ok(blocked.body.error.retryAfterSeconds >= 41 && blocked.body.error.retryAfterSeconds <= 42);
  assert.equal(Number(blocked.headers['retry-after']), blocked.body.error.retryAfterSeconds);
  assert.match(blocked.body.message, /seconds/);
  assert.equal((await request(app).post('/otp').send({ identifier: '9876543211' })).status, 200);
});

test('gateway failures do not consume the account send quota', async (t) => {
  const app = setup(t);
  for (let i = 0; i < 3; i++) {
    assert.equal((await request(app).post('/otp').send({ identifier: '9876543210', status: 502 })).status, 502);
  }
  assert.equal((await request(app).post('/otp').send({ identifier: '9876543210' })).status, 200);
});

test('invalid client requests still consume quota', async (t) => {
  const app = setup(t);
  for (let i = 0; i < 2; i++) {
    assert.equal((await request(app).post('/otp').send({ identifier: '9876543210', status: 400 })).status, 400);
  }
  assert.equal((await request(app).post('/otp').send({ identifier: '9876543210' })).status, 429);
});
