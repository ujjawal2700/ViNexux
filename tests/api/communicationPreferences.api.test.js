import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import router from '../../backend/src/routes/communications.routes.js';
import { User } from '../../backend/src/models/User.js';
import { Session } from '../../backend/src/models/Session.js';
import { generateAccessToken } from '../../backend/src/utils/token.util.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';

const userId = '507f1f77bcf86cd799439025';
let request, token, update;
beforeEach(() => {
  const app = express(); app.use(express.json()); app.use('/communications', router); app.use(errorHandler);
  request = supertest(app);
  token = generateAccessToken({ userId, sessionId: 'customer-session', role: 'customer' });
  jest.spyOn(Session, 'findOne').mockResolvedValue({ isActive: true, lastActiveAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: userId, role: 'customer', accountStatus: 'active', marketingPreferences: { email: true, push: false } });
  update = jest.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
});
afterEach(() => jest.restoreAllMocks());

test('enabling push preserves email consent and updates only the authenticated account', async () => {
  const result = await request.patch('/communications/preferences').auth(token, { type: 'bearer' }).send({ push: true });
  expect(result.status).toBe(200);
  expect(result.body.data.preferences).toEqual({ email: true, push: true });
  expect(update).toHaveBeenCalledWith({ _id: userId }, { $set: { 'marketingPreferences.push': true, 'marketingPreferences.updatedAt': expect.any(Date) } });
});
test('partial preferences require authentication and reject empty, invalid or extra fields', async () => {
  expect((await request.patch('/communications/preferences').send({ push: true })).status).toBe(401);
  for (const body of [{}, { push: 'true' }, { push: true, userId: 'someone-else' }]) {
    expect((await request.patch('/communications/preferences').auth(token, { type: 'bearer' }).send(body)).status).toBe(400);
  }
  expect(update).not.toHaveBeenCalled();
});
