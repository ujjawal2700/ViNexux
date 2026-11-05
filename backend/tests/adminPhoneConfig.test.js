import test from 'node:test';
import assert from 'node:assert/strict';
import { updateAdminPhone } from '../scripts/update_admin_phone.js';

test('updates only the matching existing administrator and clears old phone verification', async () => {
  const calls = [];
  const users = {
    findOne: async (filter) => { calls.push(filter); return { _id: 'admin-id', phone: '8949940610' }; },
    updateOne: async (...args) => { calls.push(args); return { matchedCount: 1 }; },
  };
  assert.deepEqual(await updateAdminPhone({ email: 'ADMIN@VINEXUS.IN', phone: '+91 8003923316', users }), { changed: true });
  assert.deepEqual(calls, [
    { email: 'admin@vinexus.in', role: 'admin' },
    [{ _id: 'admin-id', role: 'admin', phone: '8949940610' },
      { $set: { phone: '8003923316', isPhoneVerified: false } }, { runValidators: true }],
  ]);
});

test('does not modify or create an account when the administrator is missing', async () => {
  const users = { findOne: async () => null, updateOne: () => assert.fail('Must not update') };
  await assert.rejects(updateAdminPhone({ email: 'admin@vinexus.in', phone: '8003923316', users }), /No administrator/);
});

test('rejects an invalid phone before accessing the database', async () => {
  const users = { findOne: () => assert.fail('Must not access database') };
  await assert.rejects(updateAdminPhone({ email: 'admin@vinexus.in', phone: '12345', users }), /valid ADMIN_DEFAULT_PHONE/);
});

test('repeated updates preserve the current phone verification status', async () => {
  const users = { findOne: async () => ({ phone: '8003923316' }), updateOne: () => assert.fail('Must not update') };
  assert.deepEqual(await updateAdminPhone({ email: 'admin@vinexus.in', phone: '8003923316', users }), { changed: false });
});
