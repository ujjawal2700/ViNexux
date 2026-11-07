import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { User } from '../../backend/src/models/User.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { Session } from '../../backend/src/models/Session.js';
import { Cart } from '../../backend/src/models/Cart.js';
import { PushDevice } from '../../backend/src/models/PushDevice.js';
import { OtpVerification } from '../../backend/src/models/OtpVerification.js';
import { DealerPricing } from '../../backend/src/models/DealerPricing.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
import { mountAccountCrud } from '../../backend/src/services/adminAccount.service.js';

const actorId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const profileId = '507f1f77bcf86cd799439013';
const input = { fullName: 'Dealer Owner', email: 'owner@example.com', phone: '9876543210', companyName: 'Cable Company' };
let request, users, profiles, session, lookup;
beforeEach(() => {
  users = []; profiles = [];
  session = { withTransaction: jest.fn(async fn => fn()), endSession: jest.fn() };
  jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
  jest.spyOn(User.prototype, 'save').mockImplementation(async function () { await this.validate(); users.push(this); return this; });
  jest.spyOn(DealerProfile.prototype, 'save').mockImplementation(async function () { await this.validate(); profiles.push(this); return this; });
  lookup = jest.spyOn(User, 'findOne').mockImplementation(() => ({ session: async () => null }));
  jest.spyOn(DealerProfile, 'findOne').mockImplementation(() => ({ session: async () => null }));
  jest.spyOn(DealerProfile, 'findById').mockImplementation(() => ({ session: async () => null }));
  for (const [model, method] of [[User, 'deleteOne'], [DealerProfile, 'deleteOne'], [DealerPricing, 'deleteMany'], [Cart, 'deleteMany'], [PushDevice, 'deleteMany'], [OtpVerification, 'deleteMany'], [Session, 'deleteMany'], [Session, 'updateMany']]) jest.spyOn(model, method).mockResolvedValue({ deletedCount: 1 });
  const app = express(); app.use(express.json());
  app.use((req, res, next) => {
    const role = req.headers['x-role'];
    if (!role) return res.sendStatus(401);
    req.user = { _id: actorId, role: role === 'employee' ? 'admin' : role, isEmployee: role === 'employee' }; next();
  });
  for (const role of ['customer', 'dealer']) { const router = express.Router(); mountAccountCrud(router, role); app.use(`/${role}`, router); }
  app.use(errorHandler); request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());

test('super admin creates an instantly approved dealer with server-owned verifier attribution', async () => {
  const res = await request.post('/dealer').set('x-role', 'admin').send(input);
  expect(res.status).toBe(201);
  expect(profiles).toHaveLength(1);
  expect(profiles[0].status).toBe('approved');
  expect(profiles[0].applicationSource).toBe('admin');
  expect(String(profiles[0].kycVerifiedBy)).toBe(actorId);
  expect(profiles[0].kycVerifiedAt).toBeInstanceOf(Date);
  expect(users[0].isPhoneVerified).toBe(false);
  expect(users[0].passwordHash).toBeTruthy();
  expect(res.body.data.user.passwordHash).toBeUndefined();
  expect(session.withTransaction).toHaveBeenCalledTimes(1);
  expect(session.endSession).toHaveBeenCalledTimes(1);
});
test('customer creation uses the customer role and has no dealer approval', async () => {
  const { companyName, ...body } = input;
  const res = await request.post('/customer').set('x-role', 'admin').send(body);
  expect(res.status).toBe(201); expect(users[0].role).toBe('customer'); expect(profiles).toHaveLength(0);
});
test('employees and ordinary users cannot mutate accounts, even with write access elsewhere', async () => {
  for (const role of ['employee', 'customer', 'dealer']) {
    for (const method of ['post', 'put', 'delete']) {
      const res = await request[method](`/dealer${method === 'post' ? '' : `/${userId}`}`).set('x-role', role).send(input);
      expect(res.status).toBe(403);
    }
  }
  expect(mongoose.startSession).not.toHaveBeenCalled();
});
test('rejects role injection, forged approval metadata, invalid contacts and malformed IDs', async () => {
  for (const body of [{ ...input, role: 'admin' }, { ...input, kycVerifiedBy: userId }, { ...input, phone: '123' }]) {
    expect((await request.post('/dealer').set('x-role', 'admin').send(body)).status).toBe(400);
  }
  expect((await request.delete('/dealer/bad').set('x-role', 'admin')).status).toBe(400);
  expect(mongoose.startSession).not.toHaveBeenCalled();
});
test('contact edits reset verification, unlink Google sign-in and revoke sessions without approving pending dealers', async () => {
  const user = new User({ _id: userId, fullName: 'Old Name', email: 'old@example.com', phone: '9876543211', role: 'dealer', isPhoneVerified: true, isEmailVerified: true, googleId: 'old-google' });
  const profile = new DealerProfile({ _id: profileId, userId, companyName: 'Old Company', status: 'pending' });
  lookup.mockReturnValue({ session: async () => user });
  DealerProfile.findOne.mockReturnValue({ session: async () => profile });
  const res = await request.put(`/dealer/${userId}`).set('x-role', 'admin').send(input);
  expect(res.status).toBe(200); expect(user.fullName).toBe(input.fullName);
  expect(user.isEmailVerified).toBe(false); expect(user.isPhoneVerified).toBe(false); expect(user.googleId).toBeUndefined();
  expect(Session.updateMany).toHaveBeenCalled();
  expect(OtpVerification.deleteMany).toHaveBeenCalledWith({ identifier: { $in: ['old@example.com', '9876543211'] } }, { session });
  expect(profile.status).toBe('pending');
});
test('deletes only customer/dealer accounts, related sessions/cart/pricing, and keeps transaction history', async () => {
  lookup.mockReturnValue({ session: async () => new User({ _id: userId, fullName: 'Owner', email: input.email, role: 'dealer' }) });
  DealerProfile.findOne.mockReturnValue({ session: async () => ({ _id: profileId }) });
  const res = await request.delete(`/dealer/${userId}`).set('x-role', 'admin');
  expect(res.status).toBe(200);
  expect(User.deleteOne).toHaveBeenCalledWith({ _id: expect.anything(), role: 'dealer' }, { session });
  expect(Session.deleteMany).toHaveBeenCalled(); expect(Cart.deleteMany).toHaveBeenCalled();
  expect(DealerPricing.deleteMany).toHaveBeenCalledWith({ dealerId: profileId }, { session });
});
test('missing or wrong-role account cannot be deleted; database errors release the transaction session', async () => {
  expect((await request.delete(`/customer/${userId}`).set('x-role', 'admin')).status).toBe(404);
  expect(User.deleteOne).not.toHaveBeenCalled(); expect(session.endSession).toHaveBeenCalled();
});
test('duplicate email or phone returns a useful conflict and ends the transaction', async () => {
  User.prototype.save.mockRejectedValue(Object.assign(new Error('duplicate'), { code: 11000 }));
  const res = await request.post('/dealer').set('x-role', 'admin').send(input);
  expect(res.status).toBe(409); expect(profiles).toHaveLength(0); expect(session.endSession).toHaveBeenCalled();
});

test('dealer profile IDs resolve to the role-checked user for editing', async () => {
  const user = new User({ _id: userId, fullName: input.fullName, email: input.email, phone: input.phone, role: 'dealer' });
  const profile = new DealerProfile({ _id: profileId, userId, companyName: 'Old Company', status: 'approved', kycVerifiedBy: actorId });
  lookup.mockReturnValueOnce({ session: async () => null }).mockReturnValue({ session: async () => user });
  DealerProfile.findById.mockReturnValue({ session: async () => profile });
  DealerProfile.findOne.mockReturnValue({ session: async () => profile });
  const res = await request.put(`/dealer/${profileId}`).set('x-role', 'admin').send({ ...input, organisationType: 'Private Limited Company' });
  expect(res.status).toBe(200); expect(profile.organisationType).toBe('Private Limited Company');
  expect(String(profile.kycVerifiedBy)).toBe(actorId);
  expect(lookup).toHaveBeenLastCalledWith({ _id: profile.userId, role: 'dealer' });
});
