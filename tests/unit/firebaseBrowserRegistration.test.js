import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, jest, test } from '@jest/globals';

// Run the browser adapter with SDK/browser boundaries stubbed. In particular,
// Firebase deleteToken installs its default worker if getToken has not first
// attached the explicit configured registration to the messaging instance.
function browser({ permission = 'granted', error } = {}) {
  const registration = { scope: 'http://localhost/' }, messaging = {};
  const calls = [], register = jest.fn(async () => registration), requestPermission = jest.fn(async () => permission);
  const context = {
    env: { VITE_FIREBASE_API_KEY: 'public-fixture-key', VITE_FIREBASE_PROJECT_ID: 'fixture-project', VITE_FIREBASE_VAPID_KEY: 'fixture-vapid' },
    window: { Notification: true }, Notification: { permission, requestPermission },
    navigator: { serviceWorker: { register, ready: Promise.resolve() } },
    initializeApp: () => ({}), getApps: () => [], isSupported: async () => true, getMessaging: () => messaging,
    getToken: async (instance, options) => {
      calls.push('get'); if (error) throw new Error(error);
      expect(options.serviceWorkerRegistration).toBe(registration);
      instance.configuredRegistration = options.serviceWorkerRegistration;
      return calls.filter(call => call === 'get').length === 1 ? 'cached-token' : 'renewed-token';
    },
    deleteToken: async instance => {
      calls.push('delete');
      if (!instance.configuredRegistration) throw new Error('SDK would replace the configured worker with its default worker');
    },
    onMessage: () => () => {}, console: { warn: jest.fn() },
  };
  const source = readFileSync(new URL('../../frontend/src/lib/firebase.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replaceAll('import.meta.env', 'env').replaceAll('export const ', 'const ')
    .replace(/export \{ isFirebaseConfigured \};/, '') + '\nglobalThis.acquireToken = getPushToken;';
  vm.runInNewContext(source, context);
  return { acquire: context.acquireToken, calls, register, requestPermission };
}
test('explicit token renewal keeps the configured service worker attached before revocation', async () => {
  const fixture = browser(); expect(await fixture.acquire(true)).toBe('renewed-token');
  expect(fixture.calls).toEqual(['get', 'delete', 'get']);
  const workerUrl = fixture.register.mock.calls[0][0];
  expect(JSON.parse(new URL(workerUrl, 'http://localhost').searchParams.get('config')).projectId).toBe('fixture-project');
});
test('automatic registration never prompts or revokes an existing browser token', async () => {
  const fixture = browser(); expect(await fixture.acquire()).toBe('cached-token');
  expect(fixture.calls).toEqual(['get']); expect(fixture.requestPermission).not.toHaveBeenCalled();
});
test('denied permission does not register a worker or request a token', async () => {
  const fixture = browser({ permission: 'denied' }); expect(await fixture.acquire(true)).toBeNull();
  expect(fixture.register).not.toHaveBeenCalled(); expect(fixture.calls).toEqual([]);
});
test('explicit invalid-key errors identify Firebase configuration while quiet failures remain optional', async () => {
  const fixture = browser({ error: 'API key not valid. Please pass a valid API key.' });
  await expect(fixture.acquire(true)).rejects.toThrow('Firebase rejected the browser API key');
  expect(await fixture.acquire()).toBeNull();
});
