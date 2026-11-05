import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { authService } from '../src/services/auth.service.js';
import { User } from '../src/models/User.js';
import { OtpVerification } from '../src/models/OtpVerification.js';
import { config } from '../src/config/env.js';
import { getOtpProvider, setOtpProvider } from '../src/integrations/otp/index.js';
import { emailService } from '../src/services/email/email.service.js';

function setup(t, overrides = {}) {
  const previousMock = config.mockOtpEnabled;
  const previousProvider = getOtpProvider();
  config.mockOtpEnabled = false;
  t.after(() => { config.mockOtpEnabled = previousMock; setOtpProvider(previousProvider); });
  const user = { role: 'admin', phone: '+91 8949940610', passwordHash: 'test-hash', ...overrides };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  const password = t.mock.method(bcrypt, 'compare', async () => true);
  t.mock.method(OtpVerification, 'findOne', async () => null);
  const save = t.mock.method(OtpVerification, 'findOneAndUpdate', async () => ({}));
  const sms = t.mock.fn(async () => ({ success: true }));
  setOtpProvider({ sendOtp: sms });
  const email = t.mock.method(emailService, 'sendOtpEmail', async () => ({}));
  return { sms, email, password, save };
}

for (const [identifier, purpose] of [
  ['admin@example.test', 'login'],
  ['8949940610', 'login'],
  ['admin@example.test', 'password-reset'],
]) {
  test(`admin ${purpose} using ${identifier} delivers only to registered phone`, async (t) => {
    const { sms, email, save } = setup(t);
    const result = await authService.sendOtp({ identifier, purpose, portal: 'admin', password: 'test-password' });
    assert.equal(sms.mock.callCount(), 1);
    assert.equal(sms.mock.calls[0].arguments[0].identifier, '8949940610');
    assert.match(sms.mock.calls[0].arguments[0].otp, /^\d{6}$/);
    assert.equal(email.mock.callCount(), 0);
    // Verification continues using the same login/reset identifier.
    assert.equal(result.identifier, identifier);
    assert.deepEqual(save.mock.calls[0].arguments[0], { identifier, purpose });
    assert.equal(result.mockOtp, undefined);
  });
}

test('incorrect admin password cannot trigger an SMS', async (t) => {
  const { sms, password, save } = setup(t);
  password.mock.mockImplementation(async () => false);
  await assert.rejects(authService.sendOtp({ identifier: 'admin@example.test', portal: 'admin', password: 'wrong' }), /Invalid administrator credentials/);
  assert.equal(sms.mock.callCount(), 0);
  assert.equal(save.mock.callCount(), 0);
});

for (const phone of [undefined, '12345']) {
  test(`admin with invalid stored phone (${phone}) cannot fall back to email`, async (t) => {
    const { sms, email, save } = setup(t, { phone });
    await assert.rejects(authService.sendOtp({ identifier: 'admin@example.test', portal: 'admin', password: 'test-password' }), /valid registered mobile number/);
    assert.equal(sms.mock.callCount(), 0);
    assert.equal(email.mock.callCount(), 0);
    assert.equal(save.mock.callCount(), 0);
  });
}

test('customer email delivery remains available', async (t) => {
  const { sms, email } = setup(t, { role: 'customer' });
  await authService.sendOtp({ identifier: 'customer@example.test', portal: 'customer' });
  assert.equal(sms.mock.callCount(), 0);
  assert.equal(email.mock.callCount(), 1);
});

test('explicit mock mode contacts neither SMS nor email', async (t) => {
  const { sms, email } = setup(t);
  config.mockOtpEnabled = true;
  const result = await authService.sendOtp({ identifier: 'admin@example.test', portal: 'admin', password: 'test-password' });
  assert.equal(result.mockOtpEnabled, true);
  assert.equal(sms.mock.callCount(), 0);
  assert.equal(email.mock.callCount(), 0);
});
