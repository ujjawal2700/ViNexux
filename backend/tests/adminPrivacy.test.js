import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import supertest from '../../node_modules/supertest/index.js';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { AdminPrivacy, AdminPinChallenge } from '../src/models/AdminPrivacy.js';
import { AuditLog } from '../src/audit/audit.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../src/utils/token.util.js';
import { config } from '../src/config/env.js';
import { getOtpProvider, setOtpProvider } from '../src/integrations/otp/index.js';

const dbName = `vinexus_admin_privacy_test_${Date.now()}`;
let connected = false;
try {
  await mongoose.connect('mongodb://127.0.0.1:27019/?replicaSet=vinexusAccessTest', { dbName }); connected = true;
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const request = supertest(app), password = 'PrivacyLogin123!';
  const admin = await User.create({ fullName: 'Privacy Super Admin', email: 'privacy@example.test', phone: '9876543210', role: 'admin', status: 'active', accountStatus: 'active', passwordHash: await bcrypt.hash(password, 10) });
  const employee = await User.create({ fullName: 'Employee', email: 'employee@example.test', role: 'admin', isEmployee: true, status: 'active', accountStatus: 'active', passwordHash: await bcrypt.hash(password, 10) });
  const customer = await User.create({ fullName: 'Customer', email: 'customer@example.test', role: 'customer', status: 'active', accountStatus: 'active', passwordHash: await bcrypt.hash(password, 10) });
  const login = async user => {
    const sessionId = randomUUID(), refreshToken = generateRefreshToken();
    const session = await Session.create({ userId: user._id, userType: user.role, sessionId, refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 3600000) });
    return { session, refreshToken, token: generateAccessToken({ userId: user._id, role: user.role, sessionId }) };
  };
  const primary = await login(admin), second = await login(admin), staff = await login(employee), buyer = await login(customer);
  const call = (method, path, who = primary) => request[method](`/api/auth/admin-privacy${path}`).auth(who.token, { type: 'bearer' });
  const data = response => response.body.data;
  const expectStatus = (response, code) => { assert.equal(response.status, code, JSON.stringify(response.body)); return response; };
  const start = async (publicFlow = false) => {
    await AdminPrivacy.updateOne({ userId: admin._id }, { $unset: { lastOtpAt: 1 } });
    return data(expectStatus(publicFlow ? await request.post('/api/auth/admin-privacy/recovery/request').send({ email: admin.email, password }) : await call('post', '/reset/request').send({ password }), 200));
  };
  assert.deepEqual(data(expectStatus(await call('get', '/status'), 200)), { configured: false, locked: false });
  expectStatus(await request.get('/api/auth/admin-privacy/status'), 401);
  for (const who of [staff, buyer]) {
    expectStatus(await call('get', '/status', who), 403);
    expectStatus(await call('put', '/pin', who).send({ password, newPin: '012345' }), 403);
    expectStatus(await request.post('/api/auth/admin-privacy/recovery/request').send({ email: who === staff ? employee.email : customer.email, password }), 401);
  }
  expectStatus(await call('put', '/pin').send({ password, newPin: '12345' }), 400);
  expectStatus(await call('put', '/pin').send({ password: 'wrongpassword', newPin: '012345' }), 401);
  expectStatus(await call('put', '/pin').send({ password, newPin: '012345' }), 200);
  const stored = await AdminPrivacy.findOne({ userId: admin._id }).select('+pinHash');
  assert.notEqual(stored.pinHash, '012345'); assert.equal(await bcrypt.compare('012345', stored.pinHash), true);
  assert.equal((await AdminPrivacy.findById(stored._id)).pinHash, undefined);
  assert.equal((await Session.findById(second.session._id)).privacyLocked, true, 'PIN setup locks other sessions');
  expectStatus(await call('post', '/lock').send({}), 200);
  assert.equal(data(await call('get', '/status')).locked, true);
  expectStatus(await request.get('/api/admin/dashboard').auth(primary.token, { type: 'bearer' }), 423);
  expectStatus(await request.put('/api/admin/pos/settings').auth(primary.token, { type: 'bearer' }).send({}), 423);
  const refreshed = expectStatus(await request.post('/api/auth/refresh-token').send({ refreshToken: primary.refreshToken }), 200);
  assert.equal((await Session.findById(primary.session._id)).privacyLocked, true, 'Token refresh cannot clear the privacy lock');
  primary.token = data(refreshed).accessToken;
  for (let i = 0; i < 5; i++) expectStatus(await call('post', '/unlock').send({ pin: '999999' }), 400);
  expectStatus(await call('post', '/unlock').send({ pin: '012345' }), 429);
  await AdminPrivacy.updateOne({ userId: admin._id }, { $set: { pinBlockedUntil: new Date(Date.now() - 1000) } });
  expectStatus(await call('post', '/unlock').send({ pin: '012345' }), 200);
  expectStatus(await call('put', '/pin').send({ password, currentPin: '999999', newPin: '111111' }), 400);
  expectStatus(await call('put', '/pin').send({ password, currentPin: '012345', newPin: '111111' }), 200);
  expectStatus(await call('post', '/unlock').send({ pin: '012345' }), 400);
  expectStatus(await call('post', '/lock').send({}), 200);
  const profileReset = await start();
  assert.ok(profileReset.maskedPhone.endsWith('3210')); assert.equal(profileReset.mockOtp, config.mockOtpCode);
  expectStatus(await call('post', '/reset/request').send({ password }), 429);
  expectStatus(await request.post('/api/auth/admin-privacy/recovery/reset').send({ challengeToken: profileReset.challengeToken, otp: config.mockOtpCode, newPin: '222222' }), 400, 'Profile challenges cannot be used publicly');
  const resetBody = { challengeToken: profileReset.challengeToken, otp: config.mockOtpCode, newPin: '222222' };
  expectStatus(await call('post', '/reset/confirm', second).send(resetBody), 400);
  expectStatus(await call('post', '/reset/confirm').send(resetBody), 200);
  assert.equal((await Session.findById(primary.session._id)).privacyLocked, false);
  expectStatus(await call('post', '/reset/confirm').send(resetBody), 400, 'OTP is single-use');
  const publicReset = await start(true);
  expectStatus(await call('post', '/reset/confirm').send({ ...resetBody, challengeToken: publicReset.challengeToken }), 400);
  const publicResult = expectStatus(await request.post('/api/auth/admin-privacy/recovery/reset').send({ challengeToken: publicReset.challengeToken, otp: config.mockOtpCode, newPin: '333333' }), 200);
  assert.equal(data(publicResult).accessToken, undefined, 'PIN recovery never creates a login session');
  assert.equal((await Session.findById(primary.session._id)).privacyLocked, true);
  expectStatus(await call('post', '/unlock').send({ pin: '333333' }), 200);
  const exhausted = await start();
  for (let i = 0; i < config.otpMaxAttempts; i++) expectStatus(await call('post', '/reset/confirm').send({ challengeToken: exhausted.challengeToken, otp: '000000', newPin: '444444' }), 400);
  expectStatus(await call('post', '/reset/confirm').send({ challengeToken: exhausted.challengeToken, otp: config.mockOtpCode, newPin: '444444' }), 400);
  const expired = await start();
  await AdminPinChallenge.updateMany({ userId: admin._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  expectStatus(await call('post', '/reset/confirm').send({ challengeToken: expired.challengeToken, otp: config.mockOtpCode, newPin: '444444' }), 400);
  const stalePassword = await start();
  await User.updateOne({ _id: admin._id }, { $set: { passwordHash: await bcrypt.hash('ChangedLogin123!', 10) } });
  expectStatus(await call('post', '/reset/confirm').send({ challengeToken: stalePassword.challengeToken, otp: config.mockOtpCode, newPin: '444444' }), 409);
  await User.updateOne({ _id: admin._id }, { $set: { passwordHash: admin.passwordHash } });
  // Production delivery uses the existing SMS provider and never includes the OTP in a response.
  const provider = getOtpProvider(), wasMock = config.mockOtpEnabled; let sent;
  try {
    config.mockOtpEnabled = false; setOtpProvider({ sendOtp: async payload => { sent = payload; } });
    const realReset = await start(true);
    assert.equal(realReset.mockOtp, undefined); assert.match(sent.otp, /^\d{6}$/); assert.equal(sent.identifier, '9876543210'); assert.equal(sent.purpose, 'privacy-pin-reset');
    expectStatus(await request.post('/api/auth/admin-privacy/recovery/reset').send({ challengeToken: realReset.challengeToken, otp: sent.otp, newPin: '555555' }), 200);
  } finally { config.mockOtpEnabled = wasMock; setOtpProvider(provider); }
  const logs = JSON.stringify(await AuditLog.find({ entity: 'AdminPrivacy' }).lean());
  assert.ok(!logs.includes(stored.pinHash), 'PIN hashes are redacted from audit records');
  assert.ok(!JSON.stringify(data(await call('get', '/status'))).includes('pinHash'));
  console.log('Privacy lock integration passed: super-admin-only PIN setup/change, API lock, refresh persistence, attempts/cooldowns, SMS recovery, challenge/session binding, expiry and replay prevention.');
} finally {
  if (connected) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
