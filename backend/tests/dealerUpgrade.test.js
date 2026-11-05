import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import supertest from '../../node_modules/supertest/index.js';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { AccessRole } from '../src/models/AccessRole.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { storageService } from '../src/services/storage/storage.service.js';
import { emailService } from '../src/services/email/email.service.js';

const uri = 'mongodb://127.0.0.1:27019';
const dbName = `vinexus_dealer_upgrade_test_${Date.now()}`;
const client = new mongoose.mongo.MongoClient(`${uri}/?directConnection=true`, { serverSelectionTimeoutMS: 5000 });
let connected = false;
try {
  await client.connect();
  try { await client.db('admin').command({ replSetGetStatus: 1 }); }
  catch (error) { if (error.code === 94) await client.db('admin').command({ replSetInitiate: { _id: 'vinexusAccessTest', members: [{ _id: 0, host: '127.0.0.1:27019' }] } }); else throw error; }
  for (let i = 0; i < 100; i++) { if ((await client.db('admin').command({ hello: 1 })).isWritablePrimary) break; await new Promise(resolve => setTimeout(resolve, 100)); }
  await client.close();
  await mongoose.connect(`${uri}/?replicaSet=vinexusAccessTest`, { dbName, serverSelectionTimeoutMS: 5000 }); connected = true;
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const request = supertest(app);
  const owner = await User.create({ fullName: 'Verifying Owner', email: 'owner@example.test', phone: '9999999999', role: 'admin', accountStatus: 'active', status: 'active' });
  const customer = await User.create({ fullName: 'Existing Customer', email: 'customer@example.test', phone: '9888888888', role: 'customer', accountStatus: 'active', status: 'active', savedAddresses: [{ label: 'Office', line1: 'Road 1', city: 'Kota', state: 'Rajasthan', pincode: '324001' }] });
  const login = async user => {
    const session = await Session.create({ userId: user._id, userType: user.role, sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    return { token: generateAccessToken({ userId: user._id, role: user.role, sessionId: session.sessionId }), session };
  };
  const ownerLogin = await login(owner), customerLogin = await login(customer);
  const auth = (method, path, token = ownerLogin.token) => request[method](`/api${path}`).set('Authorization', `Bearer ${token}`);
  const apply = (method, path = '', token = customerLogin.token) => auth(method, `/dealers/application${path}`, token);
  const details = { companyName: 'Customer IT Firm', organisationType: 'Proprietorship', gstin: '08ABCDE1234F1Z5', pan: 'ABCDE1234F', whatsappNumber: '9888888888', aadhaarNumber: '123456789012', address: 'Business road', city: 'Kota', state: 'Rajasthan', pincode: '324001', officeLocation: { latitude: 25.18, longitude: 75.85 } };
  assert.equal((await request.get('/api/dealers/application')).status, 401);
  assert.equal((await apply('get')).body.data.profile, null);
  for (const payload of [{ ...details, role: 'dealer' }, { ...details, userId: String(owner._id) }, { ...details, kycDocuments: [{ type: 'gst', url: 'https://untrusted.example/file.pdf' }] }, { ...details, pan: '' }]) {
    assert.equal((await apply('put').send(payload)).status, 400);
  }
  const draft = await apply('put').send(details);
  assert.equal(draft.status, 200, JSON.stringify(draft.body));
  const profileId = draft.body.data.profile._id;
  assert.equal(draft.body.data.profile.applicationState, 'draft');
  assert.equal(draft.body.data.profile.aadhaarNumber, undefined);
  assert.equal((await User.findById(customer._id)).role, 'customer');
  assert.equal((await auth('get', '/admin/dealers')).body.data.pagination.total, 0, 'Drafts are excluded from review');
  assert.equal((await auth('get', '/admin/dealer-accounts')).body.data.pagination.total, 0, 'Applicants remain customers');
  assert.equal((await auth('put', `/admin/dealers/${profileId}/kyc/approve`).send({})).status, 409, 'Draft cannot be approved');
  assert.equal((await apply('post', '/submit').send({})).status, 400, 'Required documents enforced server-side');
  const uploadFile = storageService.uploadFile;
  storageService.uploadFile = async () => ({ url: `https://files.example/${randomUUID()}.pdf`, publicId: randomUUID() });
  try {
    for (const type of ['gst', 'aadhaar']) {
      const response = await apply('post', `/documents/${type}`).attach('file', Buffer.from('%PDF-1.4 fixture'), { filename: `${type}.pdf`, contentType: 'application/pdf' });
      assert.equal(response.status, 200, JSON.stringify(response.body));
    }
  } finally { storageService.uploadFile = uploadFile; }
  assert.equal((await apply('post', '/submit').send({})).status, 200);
  assert.equal((await apply('put').send(details)).status, 409, 'Submitted application is locked during review');
  assert.equal((await apply('post', '/submit').send({})).status, 409);
  assert.equal((await User.findById(customer._id)).role, 'customer');
  assert.equal((await auth('get', '/admin/dealers')).body.data.pagination.total, 1);
  assert.equal((await auth('get', '/admin/dealer-accounts')).body.data.pagination.total, 0);
  assert.equal((await auth('get', '/dealers/profile', customerLogin.token)).status, 403, 'No premature dealer access');
  const approvals = await Promise.all([1, 2].map(() => auth('put', `/admin/dealers/${profileId}/kyc/approve`).send({})));
  assert.deepEqual(approvals.map(response => response.status).sort(), [200, 409], 'Concurrent approvals have a single winner');
  const approved = approvals.find(response => response.status === 200);
  assert.equal((await auth('put', `/admin/dealers/${profileId}/kyc/reject`).send({ rejectionReason: 'Stale review' })).status, 409, 'Stale rejection cannot overwrite an approval');
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.data.profile.kycVerifiedBy.fullName, owner.fullName);
  assert.equal(approved.body.data.profile.kycVerifiedBy.isEmployee, false);
  assert.ok(approved.body.data.profile.kycVerifiedAt);
  assert.equal(approved.body.data.profile.aadhaarNumber, undefined);
  const upgraded = await User.findById(customer._id);
  assert.equal(upgraded.role, 'dealer');
  assert.equal(String(upgraded._id), String(customer._id));
  assert.equal(upgraded.savedAddresses.length, 1);
  assert.equal((await Session.findById(customerLogin.session._id)).userType, 'dealer');
  const me = await auth('get', '/auth/me', customerLogin.token);
  assert.equal(me.body.data.user.role, 'dealer'); assert.equal(me.body.data.user.dealerStatus, 'approved');
  assert.equal((await auth('get', '/admin/dealers')).body.data.pagination.total, 0);
  assert.equal((await auth('get', '/admin/customers')).body.data.pagination.total, 0);
  const accounts = await auth('get', '/admin/dealer-accounts');
  assert.equal(accounts.body.data.pagination.total, 1);
  assert.equal(accounts.body.data.dealers[0].kycVerifiedBy.fullName, owner.fullName);
  assert.ok(!JSON.stringify(accounts.body).includes(details.aadhaarNumber));
  assert.equal((await apply('put').send(details)).status, 403, 'Upgraded dealer cannot submit a new customer application');
  assert.equal((await DealerProfile.findById(profileId).select('+aadhaarNumber')).aadhaarNumber, details.aadhaarNumber, 'Approval does not delete private KYC data');
  const retryCustomer = await User.create({ fullName: 'Retry Customer', email: 'retry@example.test', phone: '9777777777', role: 'customer', accountStatus: 'active', status: 'active' });
  const retryLogin = await login(retryCustomer);
  const retryDetails = { ...details, companyName: 'Retry Business', gstin: '08FGHIJ5678K1Z5', pan: 'FGHIJ5678K' };
  const retryDraft = await apply('put', '', retryLogin.token).send(retryDetails);
  assert.equal(retryDraft.status, 200);
  const retryId = retryDraft.body.data.profile._id;
  // Use server-written fixture metadata for this separate rejection/resubmission check.
  await DealerProfile.updateOne({ _id: retryId }, { $set: { kycDocuments: ['gst', 'aadhaar'].map(type => ({ type, url: `https://files.example/${type}.pdf` })) } });
  assert.equal((await apply('post', '/submit', retryLogin.token).send({})).status, 200);
  const sendRejected = emailService.sendDealerKycRejectedEmail;
  emailService.sendDealerKycRejectedEmail = async () => ({ success: true });
  try { assert.equal((await auth('put', `/admin/dealers/${retryId}/kyc/reject`).send({ rejectionReason: 'Please correct the business address.' })).status, 200); }
  finally { emailService.sendDealerKycRejectedEmail = sendRejected; }
  assert.equal((await User.findById(retryCustomer._id)).role, 'customer');
  assert.equal((await apply('get', '', retryLogin.token)).body.data.profile.status, 'rejected');
  assert.equal((await apply('put', '', retryLogin.token).send({ ...retryDetails, address: 'Corrected office address' })).status, 200);
  assert.equal((await apply('post', '/submit', retryLogin.token).send({})).status, 200, 'Rejected customers can correct and resubmit');
  assert.equal(await DealerProfile.countDocuments({ userId: retryCustomer._id }), 1);
  const incompleteDealer = await User.create({ fullName: 'Unfinished Dealer', email: 'unfinished@example.test', role: 'dealer', accountStatus: 'active', status: 'active' });
  assert.equal((await auth('get', '/admin/dealer-accounts')).body.data.pagination.total, 2, 'Directory includes accounts without profiles');
  assert.equal((await auth('get', `/admin/dealer-accounts/${incompleteDealer._id}`)).status, 200);
  const employeeRole = await AccessRole.create({ name: 'Verification only', permissions: { dealers: { read: true, write: true } } });
  const employee = await User.create({ fullName: 'Verification Employee', email: 'employee@example.test', role: 'admin', isEmployee: true, accessRoleId: employeeRole._id, accountStatus: 'active', status: 'active' });
  const employeeLogin = await login(employee);
  assert.equal((await auth('get', '/admin/dealers', employeeLogin.token)).status, 200);
  assert.equal((await auth('get', '/admin/dealer-accounts', employeeLogin.token)).status, 403, 'Dealer account permissions are separate');
  assert.equal((await auth('put', `/admin/dealer-accounts/${profileId}/status`).send({ accountStatus: 'blocked' })).status, 200);
  assert.equal((await Session.findById(customerLogin.session._id)).isActive, false);
  assert.equal((await auth('put', `/admin/dealer-accounts/${profileId}/status`).send({ accountStatus: 'active' })).status, 200);
  assert.equal((await auth('put', `/admin/dealer-accounts/${profileId}/revoke`).send({ reason: 'Test revocation' })).status, 200);
  const revoked = await DealerProfile.findById(profileId);
  assert.equal(String(revoked.kycVerifiedBy), String(owner._id), 'Original approval attribution survives revocation');
  assert.equal(revoked.kycReviewAction, 'revoked');
  console.log('Dealer upgrade integration passed: authenticated drafts, required KYC, review locking, customer-to-dealer transaction, verifier identity, session and history preservation, separate directories/permissions and account blocking.');
} finally {
  await client.close();
  if (connected) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
