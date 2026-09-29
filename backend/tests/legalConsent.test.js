import assert from 'node:assert/strict';
import { signupSchema } from '../src/validators/auth.validator.js';
import { User } from '../src/models/User.js';
import { LEGAL_DOCUMENT_VERSION } from '../src/constants/legal.js';
import app from '../src/app.js';
import { config } from '../src/config/env.js';

const validSignup = {
  fullName: 'Test Customer',
  email: 'test@example.com',
  phone: '9876543210',
  password: 'ValidPassword123',
  role: 'customer',
  acceptPrivacyPolicy: true,
  acceptTerms: true,
};

assert.equal(signupSchema.body.safeParse(validSignup).success, true);
assert.equal(signupSchema.body.safeParse({ ...validSignup, acceptPrivacyPolicy: false }).success, false);
assert.equal(signupSchema.body.safeParse({ ...validSignup, acceptTerms: false }).success, false);
assert.equal(signupSchema.body.safeParse({ ...validSignup, acceptTerms: undefined }).success, false);

const acceptedAt = new Date();
const user = new User({
  fullName: validSignup.fullName,
  email: validSignup.email,
  legalConsent: {
    privacyPolicyVersion: LEGAL_DOCUMENT_VERSION,
    termsVersion: LEGAL_DOCUMENT_VERSION,
    acceptedAt,
  },
});
assert.equal(user.validateSync(), undefined);
assert.equal(user.legalConsent.privacyPolicyVersion, LEGAL_DOCUMENT_VERSION);
assert.equal(user.legalConsent.acceptedAt.getTime(), acceptedAt.getTime());

const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}${config.apiBaseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validSignup, acceptPrivacyPolicy: false }),
  });
  assert.equal(response.status, 400);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
console.log('Legal consent validation, API rejection and persistence schema passed');
