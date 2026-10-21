import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, jest, test } from '@jest/globals';

// Run the browser adapter with SDK/browser boundaries stubbed.
function browser({ permission = 'granted', error, supported = true } = {}) {
  const registration = { scope: 'http://localhost/' }, messaging = {};
  const calls = [], register = jest.fn(async () => registration), requestPermission = jest.fn(async () => { calls.push('permission'); return 'granted'; });
  const context = {
    env: { VITE_FIREBASE_API_KEY: 'public-fixture-key', VITE_FIREBASE_PROJECT_ID: 'fixture-project', VITE_FIREBASE_VAPID_KEY: 'fixture-vapid' },
    window: { Notification: true }, Notification: { permission, requestPermission },
    navigator: { serviceWorker: { register, ready: Promise.resolve() } },
    initializeApp: () => ({}), getApps: () => [], isSupported: async () => { calls.push('support'); return supported; }, getMessaging: () => messaging,
    getToken: async (instance, options) => {
      calls.push('get'); if (error) throw new Error(error);
      expect(options.serviceWorkerRegistration).toBe(registration);
      instance.configuredRegistration = options.serviceWorkerRegistration;
      return calls.filter(call => call === 'get').length === 1 ? 'cached-token' : 'renewed-token';
    },
    onMessage: () => () => {}, console: { warn: jest.fn() },
  };
  const source = readFileSync(new URL('../../frontend/src/lib/firebase.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replaceAll('import.meta.env', 'env').replaceAll('export const ', 'const ')
    .replace(/export \{ isFirebaseConfigured \};/, '') + '\nglobalThis.acquireToken = getPushToken;';
  vm.runInNewContext(source, context);
  return { acquire: context.acquireToken, calls, register, requestPermission };
}
test('explicit enabling reuses a valid token with the configured service worker', async () => {
  const fixture = browser(); expect(await fixture.acquire(true)).toBe('cached-token');
  expect(fixture.calls).toEqual(['support', 'get']);
  expect(fixture.requestPermission).not.toHaveBeenCalled();
  const workerUrl = fixture.register.mock.calls[0][0];
  expect(JSON.parse(new URL(workerUrl, 'http://localhost').searchParams.get('config')).projectId).toBe('fixture-project');
});
test('automatic registration never prompts or revokes an existing browser token', async () => {
  const fixture = browser(); expect(await fixture.acquire()).toBe('cached-token');
  expect(fixture.calls).toEqual(['support', 'get']); expect(fixture.requestPermission).not.toHaveBeenCalled();
});
test('denied permission does not register a worker or request a token', async () => {
  const fixture = browser({ permission: 'denied' }); expect(await fixture.acquire(true)).toBeNull();
  expect(fixture.register).not.toHaveBeenCalled(); expect(fixture.calls).toEqual([]);
  expect(fixture.requestPermission).not.toHaveBeenCalled();
});
test('first-time enabling requests permission before asynchronous SDK checks', async () => {
  const fixture = browser({ permission: 'default' });
  const pending = fixture.acquire(true);
  expect(fixture.requestPermission).toHaveBeenCalledTimes(1);
  expect(await pending).toBe('cached-token');
  expect(fixture.calls).toEqual(['permission', 'support', 'get']);
});
test('first-time automatic registration leaves permission to an explicit gesture', async () => {
  const fixture = browser({ permission: 'default' });
  expect(await fixture.acquire()).toBeNull();
  expect(fixture.requestPermission).not.toHaveBeenCalled();
  expect(fixture.register).not.toHaveBeenCalled();
});
test('explicit invalid-key errors identify Firebase configuration while quiet failures remain optional', async () => {
  const fixture = browser({ error: 'API key not valid. Please pass a valid API key.' });
  await expect(fixture.acquire(true)).rejects.toThrow('Firebase rejected the browser API key');
  expect(await fixture.acquire()).toBeNull();
});
