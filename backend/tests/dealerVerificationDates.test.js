import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import supertest from '../../node_modules/supertest/index.js';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { generateAccessToken } from '../src/utils/token.util.js';
const dbName = `vinexus_dealer_dates_test_${Date.now()}`;
let connected = false;
try {
  await mongoose.connect('mongodb://127.0.0.1:27019/?replicaSet=vinexusAccessTest', { dbName }); connected = true;
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const owner = await User.create({ fullName: 'Date Filter Owner', email: 'dates.owner@example.test', role: 'admin', status: 'active', accountStatus: 'active' });
  const session = await Session.create({ userId: owner._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) });
  const request = supertest(app), token = generateAccessToken({ userId: owner._id, role: 'admin', sessionId: session.sessionId });
  const list = query => request.get(`/api/admin/dealers${query}`).auth(token, { type: 'bearer' });
  const rows = [
    ['Before boundary', '2026-11-25T23:59:59+05:30'], ['At start', '2026-11-26T00:00:00+05:30'],
    ['At end', '2026-11-26T23:59:59+05:30'], ['After boundary', '2026-11-27T00:00:00+05:30'],
    ['Legacy', null], ['Draft', '2026-11-26T10:00:00+05:30', 'draft'], ['Approved', '2026-11-26T10:00:00+05:30', 'submitted', 'approved'],
  ];
  for (const [i, [name, submitted, applicationState = 'submitted', status = 'pending']] of rows.entries()) {
    const user = await User.create({ fullName: name, email: `dates.dealer${i}@example.test`, role: 'dealer' });
    await DealerProfile.create({ userId: user._id, companyName: name, applicationState, status, createdAt: new Date(submitted ? '2026-11-20T10:00:00+05:30' : '2026-11-26T14:00:00+05:30'), ...(submitted ? { applicationSubmittedAt: new Date(submitted) } : {}) });
  }
  const filtered = await list('?from=2026-11-26&to=2026-11-26');
  assert.equal(filtered.status, 200, JSON.stringify(filtered.body));
  assert.deepEqual(filtered.body.data.dealers.map(dealer => dealer.companyName).sort(), ['At end', 'At start', 'Legacy']);
  const searched = await list('?from=2026-11-26&to=2026-11-26&search=At%20start');
  assert.equal(searched.body.data.dealers.length, 1); assert.equal(searched.body.data.dealers[0].companyName, 'At start');
  assert.equal((await list('?from=2026-02-30')).status, 400);
  assert.equal((await list('?from=2026-11-27&to=2026-11-26')).status, 400);
  console.log('Dealer date filters passed: IST inclusive boundaries, submission date, legacy fallback, search combination and validation.');
} finally {
  if (connected) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
