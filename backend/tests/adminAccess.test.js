import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import supertest from '../../node_modules/supertest/index.js';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Product } from '../src/models/Product.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { Brand } from '../src/models/Brand.js';
import { AuditLog, auditContext } from '../src/audit/audit.js';
import { generateAccessToken } from '../src/utils/token.util.js';

// Explicitly isolated from application data. Start a temporary replica set on this port.
const uri = 'mongodb://127.0.0.1:27019';
const dbName = `vinexus_access_test_${Date.now()}`;
const client = new mongoose.mongo.MongoClient(`${uri}/?directConnection=true`, { serverSelectionTimeoutMS: 5000 });
let connected = false;
try {
  await client.connect();
  try { await client.db('admin').command({ replSetGetStatus: 1 }); }
  catch (error) { if (error.code === 94) await client.db('admin').command({ replSetInitiate: { _id: 'vinexusAccessTest', members: [{ _id: 0, host: '127.0.0.1:27019' }] } }); else throw error; }
  for (let i = 0; i < 100; i++) {
    if ((await client.db('admin').command({ hello: 1 })).isWritablePrimary) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await client.close();
  await mongoose.connect(`${uri}/?replicaSet=vinexusAccessTest`, { dbName, serverSelectionTimeoutMS: 5000 }); connected = true;
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  assert.equal(Product.collection.$auditInstalled, true, 'Application models must be audited at the collection layer');
  const request = supertest(app);
  const superAdmin = await User.create({ fullName: 'Super Admin', email: 'owner@example.test', phone: '9999999999', role: 'admin', accountStatus: 'active', status: 'active' });
  const login = async user => {
    const session = await Session.create({ userId: user._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    return { token: generateAccessToken({ userId: user._id, role: 'admin', sessionId: session.sessionId }), session };
  };
  const owner = await login(superAdmin);
  const auth = (method, path, token = owner.token) => request[method](`/api${path}`).set('Authorization', `Bearer ${token}`);
  const permissions = { 'enquiries-customers': { read: true, write: false }, products: { read: true, write: false }, sessions: { read: true, write: true } };
  let roleResponse = await auth('post', '/admin/access/roles').send({ name: 'Inventory team', permissions });
  assert.equal(roleResponse.status, 200, JSON.stringify(roleResponse.body));
  const roleId = roleResponse.body.data.role._id;
  const employeeData = { fullName: 'Asha Employee', email: 'asha@example.test', phone: '9888888888', password: 'Test-password-2026', accessRoleId: roleId, accountStatus: 'active' };
  const created = await auth('post', '/admin/access/employees').send(employeeData);
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal(created.body.data.employee.passwordHash, undefined);
  const employee = await User.findById(created.body.data.employee._id);
  const employeeLogin = await login(employee);
  const token = employeeLogin.token;
  assert.equal((await auth('get', '/admin/products', token)).status, 200);
  assert.equal((await auth('get', '/admin/categories', token)).status, 403);
  assert.equal((await auth('get', '/admin/access/logs', token)).status, 403);
  assert.equal((await auth('post', '/admin/access/roles', token).send({ name: 'Escalated', permissions })).status, 403);
  assert.equal((await auth('get', `/admin/sessions/${owner.session._id}`, token)).status, 403);
  const brand = await Brand.create({ name: 'Test brand', slug: 'access-test-brand', isActive: true });
  const product = await Product.create({ name: 'Audited Camera', sku: 'AUDIT-CAM', modelNumber: 'AUDIT-01', stockQuantity: 10, brandId: brand._id, standardPrice: 100, isActive: true });
  for (const userType of ['customer', 'dealer']) await Enquiry.create({ enquiryNumber: `ENQ-${userType}`, userId: employee._id,
    contactName: 'Test Contact', contactEmail: 'contact@example.test', contactPhone: '9777777777', whatsappNumber: '9777777777',
    userType, items: [{ productId: product._id, productName: product.name, quantity: 1, priceShown: 100 }] });
  const enquiries = await auth('get', '/admin/enquiries', token);
  assert.equal(enquiries.status, 200, JSON.stringify(enquiries.body));
  assert.ok(enquiries.body.data.enquiries.every(enquiry => enquiry.userType === 'customer'));
  assert.equal((await auth('get', '/admin/enquiries?userType=dealer', token)).status, 403);
  const dealerEnquiry = await Enquiry.findOne({ userType: 'dealer' });
  assert.equal((await auth('get', `/admin/enquiries/${dealerEnquiry._id}?userType=customer`, token)).status, 403,
    'A detail request must authorize against the stored enquiry type, not the query string');
  const stockPath = `/admin/products/${product._id}/stock`;
  assert.equal((await auth('post', stockPath, token).send({ quantity: 2 })).status, 403);
  const updateRole = async (read, write, isActive = true) => {
    const response = await auth('put', `/admin/access/roles/${roleId}`).send({ name: 'Inventory team', permissions: { ...permissions, products: { read, write } }, isActive });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  };
  await updateRole(true, true);
  const location = { status: 'available', latitude: 26.912434, longitude: 75.787271, accuracy: 12, timestamp: Date.now() };
  const stockResponse = await auth('post', stockPath, token).set('X-Admin-Location', JSON.stringify(location)).send({ quantity: 2 });
  assert.equal(stockResponse.status, 200, JSON.stringify(stockResponse.body));
  const entry = await AuditLog.findOne({ 'actor.id': String(employee._id), entity: 'Product', 'documents.changes.field': 'stockQuantity' }).lean();
  assert.ok(entry);
  const stockChange = entry.documents[0].changes.find(change => change.field === 'stockQuantity');
  assert.deepEqual(stockChange, { field: 'stockQuantity', before: 10, after: 12 });
  assert.equal(entry.location.latitude, location.latitude);
  assert.equal(entry.actor.name, 'Asha Employee');
  assert.ok(entry.createdAt instanceof Date);
  const concurrent = await Promise.all([3, 7].map(quantity => auth('post', stockPath, token).send({ quantity })));
  assert.ok(concurrent.every(response => response.status === 200), JSON.stringify(concurrent.map(r => r.body)));
  assert.equal((await Product.findById(product._id)).stockQuantity, 22);
  const changes = (await AuditLog.find({ 'actor.id': String(employee._id), entity: 'Product' }).sort({ createdAt: 1 }).lean())
    .flatMap(log => log.documents.flatMap(doc => doc.changes.filter(change => change.field === 'stockQuantity')));
  assert.deepEqual(changes.map(c => c.after - c.before).sort((a, b) => a - b), [2, 3, 7], 'Concurrent writes must have exact independent diffs');
  const originalJournalInsert = AuditLog.collection.insertOne;
  AuditLog.collection.insertOne = async () => { throw new Error('Simulated journal outage'); };
  try {
    assert.equal((await auth('post', stockPath, token).send({ quantity: 5 })).status, 500);
    assert.equal((await Product.findById(product._id)).stockQuantity, 22, 'A journal outage must roll back the database write');
  } finally { AuditLog.collection.insertOne = originalJournalInsert; }
  await updateRole(false, true);
  assert.equal((await auth('get', '/admin/products', token)).status, 403, 'Write-only must not imply read');
  const writeOnlyResponse = await auth('post', stockPath, token).send({ quantity: 1 });
  assert.equal(writeOnlyResponse.status, 200);
  assert.deepEqual(writeOnlyResponse.body.data, { saved: true }, 'Write-only responses must not leak existing record contents');
  assert.equal((await auth('put', `/products/${product._id}`, token).send({ description: 'Updated via legacy product alias' })).status, 200);
  await updateRole(true, true, false);
  assert.equal((await auth('get', '/admin/products', token)).status, 403, 'Disabling a role applies to existing tokens');
  await updateRole(true, true);
  const passwordEntries = await AuditLog.find({ entity: 'User', 'documents.id': String(employee._id) }).lean();
  assert.ok(passwordEntries.length);
  assert.ok(JSON.stringify(passwordEntries).includes('[REDACTED]'));
  assert.ok(!JSON.stringify(passwordEntries).includes(employeeData.password));
  assert.ok(!JSON.stringify(passwordEntries).includes('$2b$'));
  const assignments = await auth('get', `/admin/access/roles/${roleId}/assignments`);
  assert.equal(assignments.status, 200);
  assert.equal(assignments.body.data.employees[0].fullName, employeeData.fullName);
  assert.equal(assignments.body.data.employees[0].passwordHash, undefined);
  const inUse = await auth('delete', `/admin/access/roles/${roleId}`);
  assert.equal(inUse.status, 409, 'Assigned roles cannot be deleted');
  assert.equal(inUse.body.error.code, 'ROLE_IN_USE');
  assert.equal(inUse.body.details[0].email, employeeData.email);
  const spareRole = await auth('post', '/admin/access/roles').send({ name: 'Unused role', permissions: {} });
  assert.equal((await auth('delete', `/admin/access/roles/${spareRole.body.data.role._id}`)).status, 200);
  assert.equal((await auth('delete', `/admin/access/roles/${spareRole.body.data.role._id}`)).status, 404);
  const raceRole = await auth('post', '/admin/access/roles').send({ name: 'Concurrent assignment role', permissions: {} });
  const raceRoleId = raceRole.body.data.role._id;
  const [assigned, deleted] = await Promise.all([
    auth('post', '/admin/access/employees').send({ ...employeeData, email: 'race@example.test', phone: '9777777777', accessRoleId: raceRoleId }),
    auth('delete', `/admin/access/roles/${raceRoleId}`),
  ]);
  assert.ok((assigned.status === 200 && deleted.status === 409) || (assigned.status === 400 && deleted.status === 200),
    JSON.stringify({ assigned: assigned.body, deleted: deleted.body }));
  assert.equal(await User.countDocuments({ isEmployee: true, accessRoleId: raceRoleId }), assigned.status === 200 ? 1 : 0);
  const { password, ...blockedEmployee } = employeeData;
  assert.equal((await auth('put', `/admin/access/employees/${employee._id}`).send({ ...blockedEmployee, accountStatus: 'blocked' })).status, 200);
  assert.equal((await Session.findById(employeeLogin.session._id)).isActive, false);
  assert.ok([401, 403].includes((await auth('get', '/admin/products', token)).status));
  const context = { actor: { id: String(superAdmin._id), name: 'Super Admin', isEmployee: false }, section: 'products', requestId: randomUUID(), location: { status: 'unavailable' } };
  const beforeCount = await AuditLog.countDocuments();
  const session = await mongoose.startSession();
  try {
    await assert.rejects(() => session.withTransaction(async () => auditContext.run(context, async () => {
      await Product.updateOne({ _id: product._id }, { $set: { hsnCode: '1234' } }, { session });
      throw new Error('Abort transaction');
    })), /Abort transaction/);
  } finally { await session.endSession(); }
  assert.equal(await AuditLog.countDocuments(), beforeCount, 'Rolled-back transactions must leave no applied journal entry');
  assert.equal((await Product.findById(product._id)).hsnCode, '');
  await auditContext.run(context, () => Product.bulkWrite([{ updateOne: { filter: { _id: product._id }, update: { $set: { hsnCode: '012345' } } } }]));
  assert.ok(await AuditLog.exists({ operation: 'bulkWrite', 'documents.changes.field': 'hsnCode' }));
  const listing = await auth('get', '/admin/access/logs?search=Asha');
  assert.equal(listing.status, 200, JSON.stringify(listing.body));
  assert.ok(listing.body.data.total > 0);
  console.log('Admin access integration passed: permissions, live role changes, employee management, session protection, exact concurrent audit diffs, location, secret redaction, bulk writes and transaction rollback.');
} finally {
  await client.close();
  if (connected) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
