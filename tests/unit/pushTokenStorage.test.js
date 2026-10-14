import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, jest, test } from '@jest/globals';

const source = readFileSync(new URL('../../frontend/src/services/pushService.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export const pushService', 'const pushService')
  .replace('export default pushService;', 'globalThis.service = pushService;');
function load(storage = new Map(), post = jest.fn(async () => ({ data: { success: true } }))) {
  const context = { apiClient: { post }, localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } };
  vm.runInNewContext(source, context);
  return { service: context.service, storage, post, context };
}
test('customer/dealer and admin tokens persist separately after database registration', async () => {
  const { service, storage, post } = load();
  await service.registerToken('customer-token'); await service.registerToken('admin-token', 'admin');
  expect(storage.get('vinexus_fcm_token')).toBe('customer-token');
  expect(storage.get('vinexus_admin_fcm_token')).toBe('admin-token');
  expect(post).toHaveBeenCalledWith('/push/register-token', { token: 'customer-token' }, { portal: 'customer' });
});
test('logout after a reload reads the saved token and removes only the selected portal', async () => {
  const storage = new Map([['vinexus_fcm_token', 'customer-token'], ['vinexus_admin_fcm_token', 'admin-token']]);
  const { service, post } = load(storage);
  await service.unregisterToken(undefined, 'customer');
  expect(post).toHaveBeenCalledWith('/push/unregister-token', { token: 'customer-token' }, { portal: 'customer' });
  expect(storage.has('vinexus_fcm_token')).toBe(false); expect(storage.get('vinexus_admin_fcm_token')).toBe('admin-token');
});
test('failed database registration does not overwrite a successfully saved token', async () => {
  const storage = new Map([['vinexus_fcm_token', 'old-token']]);
  const { service } = load(storage, jest.fn(async () => { throw new Error('Offline'); }));
  await expect(service.registerToken('new-token')).rejects.toThrow('Offline');
  expect(storage.get('vinexus_fcm_token')).toBe('old-token');
});
test('token renewal replaces local storage and an older unregister cannot erase it', async () => {
  let finish;
  const post = jest.fn(async path => {
    if (path.includes('unregister')) await new Promise(resolve => { finish = resolve; });
    return { data: { success: true } };
  });
  const { service, storage } = load(new Map(), post);
  await service.registerToken('old-token'); const pending = service.unregisterToken();
  await service.registerToken('new-token'); finish(); await pending;
  expect(storage.get('vinexus_fcm_token')).toBe('new-token');
});
test('blocked browser storage does not prevent database registration or in-memory logout cleanup', async () => {
  const { service, context, post } = load();
  context.localStorage = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); }, removeItem() { throw Error('Blocked'); } };
  await expect(service.registerToken('browser-token')).resolves.toEqual({ success: true });
  await service.unregisterToken();
  expect(post).toHaveBeenLastCalledWith('/push/unregister-token', { token: 'browser-token' }, { portal: 'customer' });
});
test('logout clears the local token even when the unregister request fails', async () => {
  const storage = new Map([['vinexus_fcm_token', 'browser-token']]);
  const { service } = load(storage, jest.fn(async () => { throw Error('Offline'); }));
  await expect(service.unregisterToken()).rejects.toThrow('Offline');
  expect(storage.has('vinexus_fcm_token')).toBe(false);
});
