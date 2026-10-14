import { afterAll, afterEach, expect, jest, test } from '@jest/globals';
import { createRequire } from 'node:module';
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url));
const sendEachForMulticast = jest.fn();
const app = { name: 'vinexus-push' };
const cert = jest.fn(value => value);
const initializeApp = jest.fn(() => app);
jest.unstable_mockModule(backendRequire.resolve('firebase-admin/app').replace('/lib/app/', '/lib/esm/app/'), () => ({ cert, getApps: () => [], initializeApp }));
jest.unstable_mockModule(backendRequire.resolve('firebase-admin/messaging').replace('/lib/messaging/', '/lib/esm/messaging/'), () => ({ getMessaging: jest.fn(() => ({ sendEachForMulticast })) }));
const { config } = await import('../../backend/src/config/env.js');
const { FirebasePushProvider } = await import('../../backend/src/integrations/push/FirebasePushProvider.js');
const original = { firebaseProjectId: config.firebaseProjectId, firebaseClientEmail: config.firebaseClientEmail, firebasePrivateKey: config.firebasePrivateKey };
Object.assign(config, { firebaseProjectId: 'fixture-project', firebaseClientEmail: 'fixture@example.test', firebasePrivateKey: 'fixture-key' });
afterEach(() => { sendEachForMulticast.mockReset(); });

test('installed modular Firebase Admin API sends rich campaign data and reports per-device results', async () => {
  sendEachForMulticast.mockResolvedValue({ successCount: 1, failureCount: 2, responses: [
    { success: true }, { success: false, error: { code: 'messaging/registration-token-not-registered' } },
    { success: false, error: { code: 'messaging/server-unavailable' } },
  ] });
  const result = await new FirebasePushProvider().sendToTokens({ tokens: ['valid', 'revoked', 'retryable'], campaign: true,
    ttl: 300, data: { title: 'Admin test', imageUrl: 'https://example.test/image.jpg', link: 'https://example.test/products' } });
  expect(initializeApp).toHaveBeenCalledWith({ credential: expect.anything() }, 'vinexus-push');
  expect(sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'Admin test' }), webpush: { headers: { TTL: '300' } } }));
  expect(result).toMatchObject({ successCount: 1, failureCount: 2, invalidTokens: ['revoked'] });
});
test('Firebase transport errors fail instead of claiming delivery', async () => {
  sendEachForMulticast.mockRejectedValue(new Error('Transport unavailable'));
  await expect(new FirebasePushProvider().sendToTokens({ tokens: ['browser'], title: 'Test', body: 'Test' })).rejects.toThrow('Failed to deliver');
});
test('no browser tokens means no Firebase request', async () => {
  await new FirebasePushProvider().sendToTokens({ tokens: [] });
  expect(sendEachForMulticast).not.toHaveBeenCalled();
});
// This module runs in its own Jest environment; leave configuration clean nevertheless.
afterAll(() => Object.assign(config, original));
