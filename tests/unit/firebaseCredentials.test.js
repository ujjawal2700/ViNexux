import { expect, test } from '@jest/globals';
import { parseFirebaseServiceAccount } from '../../backend/src/config/firebaseCredentials.js';

test('single-line Firebase JSON preserves PEM newlines and maps SDK fields', () => {
  const privateKey = '-----BEGIN PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----\n';
  const account = parseFirebaseServiceAccount(JSON.stringify({ type: 'service_account', project_id: 'example', client_email: 'example@example.iam.gserviceaccount.com', private_key: privateKey }));
  expect(account).toEqual({ projectId: 'example', clientEmail: 'example@example.iam.gserviceaccount.com', privateKey });
  expect(parseFirebaseServiceAccount('')).toEqual({});
  expect(parseFirebaseServiceAccount(undefined)).toEqual({});
});

test('invalid or incomplete Firebase JSON fails without exposing credential fragments', () => {
  for (const value of ['{"private_key":"sensitive-fragment"', '{}', 'null', '{"type":"authorized_user"}']) {
    let error; try { parseFirebaseServiceAccount(value); } catch (caught) { error = caught; }
    expect(error?.message).toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
    expect(error.message).not.toContain('sensitive-fragment');
  }
});
