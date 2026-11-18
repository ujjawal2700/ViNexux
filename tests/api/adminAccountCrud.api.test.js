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
import storageService from '../../backend/src/services/storage/storage.service.js';
import { mountAccountCrud } from '../../backend/src/services/adminAccount.service.js';

const actorId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const profileId = '507f1f77bcf86cd799439013';
const input = { fullName: 'Dealer Owner', email: 'owner@example.com', phone: '9876543210', companyName: 'Cable Company' };
const details = { ...input, organisationType: 'Proprietorship', gstin: '08ABCDE1234F1Z5', pan: 'ABCDE1234F', aadhaarNumber: '123456789012', whatsappNumber: '9876543210', address: 'Business road', city: 'Kota', state: 'Rajasthan', pincode: '324001', officeLocation: { latitude: 25.18, longitude: 75.85 }, msmeNumber: '' };
const businessDetails = () => Object.fromEntries(Object.entries(details).filter(([key]) => !['fullName', 'email', 'phone'].includes(key)));
const enroll = (body = details, { path = '/dealer', role = 'admin', documents = ['gst', 'aadhaar'] } = {}) => {
  let req = request.post(path).set('x-role', role).field('details', JSON.stringify(body));
  for (const type of documents) req = req.attach(type, Buffer.from('%PDF-1.4 fixture'), { filename: `${type}.pdf`, contentType: 'application/pdf' });
  return req;
};
let request, users, profiles, session, lookup;
beforeEach(() => {
  users = []; profiles = [];
  jest.spyOn(storageService, 'uploadFile').mockImplementation(async file => ({ url: `https://storage.example/${file.originalname}`, publicId: `kyc/${file.originalname}` }));
  jest.spyOn(storageService, 'deleteFile').mockResolvedValue({});
  jest.spyOn(DealerProfile, 'exists').mockReturnValue({ session: async () => null });
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
  const res = await enroll();
  expect(res.status).toBe(201);
  expect(profiles).toHaveLength(1);
  expect(profiles[0].status).toBe('approved');
  expect(profiles[0].applicationSource).toBe('admin');
  expect(profiles[0].aadhaarNumber).toBe(details.aadhaarNumber);
  expect(profiles[0].officeLocation.latitude).toBe(25.18);
  expect(profiles[0].kycDocuments.map(doc => doc.type)).toEqual(['gst', 'aadhaar']);
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
    expect((await enroll({ ...details, ...body })).status).toBe(400);
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
  const res = await enroll();
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


test('admin dealer creation accepts optional business details and no documents', async () => {
  expect((await enroll({ ...input, organisationType: '', gstin: '', pan: '', aadhaarNumber: '', whatsappNumber: '', msmeNumber: '', city: '', state: '', pincode: '' }, { documents: [] })).status).toBe(201);
  expect(profiles[0].kycDocuments).toHaveLength(0);
  expect(profiles[0].status).toBe('approved');
  expect(storageService.uploadFile).not.toHaveBeenCalled();
});

test('provided business fields and coordinates are validated, and document URLs cannot be forged', async () => {
  for (const officeLocation of [{ latitude: '', longitude: '' }, { latitude: 100, longitude: 75 }, { latitude: null, longitude: 75 }]) {
    expect((await enroll({ ...details, officeLocation })).status).toBe(400);
  }
  expect((await enroll({ ...details, kycDocuments: [{ type: 'aadhaar', url: 'https://forged.example/doc' }] })).status).toBe(400);
  expect((await enroll({ ...input, gstin: 'invalid' }, { documents: [] })).status).toBe(400);
  expect(storageService.uploadFile).not.toHaveBeenCalled();
  expect(mongoose.startSession).not.toHaveBeenCalled();
});

test('converts the existing customer atomically, preserves identity and history, and revokes old sessions', async () => {
  const user = new User({ _id: userId, fullName: 'Existing Customer', email: 'customer@example.com', phone: '9888888888', role: 'customer', accountStatus: 'active', isEmailVerified: true, googleId: 'keep-google', currentSessionId: 'old-session' });
  lookup.mockReturnValue({ session: async () => user });
  const existing = new DealerProfile({ _id: profileId, userId, companyName: 'Old application', applicationSource: 'customer', applicationState: 'draft', status: 'pending' });
  DealerProfile.findOne.mockReturnValue({ session: async () => existing });
  const res = await enroll(businessDetails(), { path: `/customer/${userId}/convert-to-dealer` });
  expect(res.status).toBe(200);
  expect(res.body.data.user._id).toBe(userId);
  expect(res.body.data.user.dealerProfileId).toBe(profileId);
  expect(user.role).toBe('dealer'); expect(user.email).toBe('customer@example.com'); expect(user.phone).toBe('9888888888');
  expect(user.isEmailVerified).toBe(true); expect(user.googleId).toBe('keep-google'); expect(user.currentSessionId).toBeUndefined();
  expect(existing.status).toBe('approved'); expect(String(existing.kycVerifiedBy)).toBe(actorId);
  expect(existing.kycDocuments).toHaveLength(2);
  expect(Session.updateMany).toHaveBeenCalledWith({ userId: user._id, isActive: true }, expect.anything(), { session });
  expect(Cart.deleteMany).not.toHaveBeenCalled(); expect(User.deleteOne).not.toHaveBeenCalled();
  expect(res.body.data.user.aadhaarNumber).toBeUndefined();
});

test('conversion rejects employees, wrong-role/missing users, blocked customers, forged roles and malformed IDs', async () => {
  const path = `/customer/${userId}/convert-to-dealer`;
  expect((await enroll(businessDetails(), { path, role: 'employee' })).status).toBe(403);
  expect((await enroll(businessDetails(), { path })).status).toBe(404);
  lookup.mockReturnValue({ session: async () => new User({ _id: userId, fullName: 'Blocked Customer', email: 'blocked@example.com', role: 'customer', accountStatus: 'blocked' }) });
  expect((await enroll(businessDetails(), { path })).status).toBe(409);
  expect((await enroll({ ...businessDetails(), role: 'admin' }, { path })).status).toBe(400);
  expect((await enroll(businessDetails(), { path: '/customer/invalid/convert-to-dealer' })).status).toBe(400);
  expect(profiles).toHaveLength(0);
});

test('duplicate business identifiers and failed uploads clean up files without granting dealer access', async () => {
  DealerProfile.exists.mockReturnValue({ session: async () => ({ _id: profileId }) });
  expect((await enroll()).status).toBe(409);
  expect(storageService.deleteFile).toHaveBeenCalledTimes(2);
  expect(profiles).toHaveLength(0);
  storageService.deleteFile.mockClear();
  storageService.uploadFile.mockReset().mockResolvedValueOnce({ url: 'https://storage.example/gst.pdf', publicId: 'first-upload' }).mockRejectedValueOnce(new Error('Storage unavailable'));
  expect((await enroll()).status).toBe(500);
  expect(storageService.deleteFile).toHaveBeenCalledWith('first-upload');
});


test('dealer enrollment rejects executable files, unknown document fields and oversized uploads', async () => {
  const badType = await request.post('/dealer').set('x-role', 'admin').field('details', JSON.stringify(details))
    .attach('gst', Buffer.from('script'), { filename: 'script.js', contentType: 'application/javascript' });
  expect(badType.status).toBe(400);
  expect((await enroll(details, { documents: ['unknown'] })).status).toBe(400);
  const tooLarge = await request.post('/dealer').set('x-role', 'admin').field('details', JSON.stringify(details))
    .attach('gst', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'gst.pdf', contentType: 'application/pdf' });
  expect(tooLarge.status).toBe(400);
  expect(storageService.uploadFile).not.toHaveBeenCalled();
  expect(mongoose.startSession).not.toHaveBeenCalled();
});


test('conversion accepts only company name, keeps existing documents and leaves optional uploads empty', async () => {
  const user = new User({ _id: userId, fullName: 'Existing Customer', email: 'customer@example.com', phone: '9888888888', role: 'customer', accountStatus: 'active' });
  lookup.mockReturnValue({ session: async () => user });
  const existing = new DealerProfile({ _id: profileId, userId, companyName: 'Old application', gstin: details.gstin, kycDocuments: [{ type: 'aadhaar', url: 'https://storage.example/original.pdf' }] });
  DealerProfile.findOne.mockReturnValue({ session: async () => existing });
  const res = await enroll({ companyName: 'Updated company' }, { path: `/customer/${userId}/convert-to-dealer`, documents: [] });
  expect(res.status).toBe(200); expect(user.role).toBe('dealer');
  expect(existing.kycDocuments[0].url).toBe('https://storage.example/original.pdf');
  expect(existing.gstin).toBe(details.gstin);
  expect(storageService.uploadFile).not.toHaveBeenCalled();
});
