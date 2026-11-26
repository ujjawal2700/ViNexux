import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';

let adminLocation, permission, geo, watches, originalNavigator;
const fix = () => ({ coords: { latitude: 25.18, longitude: 75.85, accuracy: 20 }, timestamp: Date.now() });
const flush = () => new Promise(resolve => setImmediate(resolve));
beforeEach(async () => {
  jest.resetModules(); watches = [];
  permission = { state: 'granted', onchange: null };
  geo = {
    getCurrentPosition: jest.fn(ok => ok(fix())),
    watchPosition: jest.fn((ok, error) => { watches.push({ ok, error }); return watches.length; }),
    clearWatch: jest.fn(),
  };
  originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: geo, permissions: { query: async () => permission } } });
  ({ adminLocation } = await import('../../frontend/src/utils/adminLocation.js'));
});
afterEach(() => {
  adminLocation.stop(); jest.restoreAllMocks();
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
});

test('a transient watch timeout preserves a fresh position and does not request permission again', async () => {
  const first = await adminLocation.requireValid();
  watches[0].error({ code: 3 });
  expect(adminLocation.get()).toEqual(first);
  expect(await adminLocation.requireValid()).toEqual(first);
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(geo.getCurrentPosition.mock.calls[0][2].enableHighAccuracy).toBe(false);
});

test('parallel admin requests share one location acquisition', async () => {
  let complete;
  geo.getCurrentPosition.mockImplementation(ok => { complete = ok; });
  const pending = Array.from({ length: 8 }, () => adminLocation.requireValid());
  await flush(); expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  complete(fix());
  expect((await Promise.all(pending)).every(value => value.status === 'available')).toBe(true);
});

test('denial blocks even a fresh position; granting permission automatically restarts acquisition', async () => {
  await adminLocation.requireValid();
  permission.state = 'denied'; permission.onchange();
  expect(adminLocation.get().status).toBe('denied');
  await expect(adminLocation.requireValid()).rejects.toMatchObject({ code: 'LOCATION_REQUIRED' });
  permission.state = 'granted'; permission.onchange();
  await flush();
  expect(adminLocation.get().status).toBe('available');
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
});

test('expired positions are reacquired rather than sent to admin APIs', async () => {
  await adminLocation.requireValid();
  const later = Date.now() + 121000;
  jest.spyOn(Date, 'now').mockReturnValue(later);
  watches[0].error({ code: 3 });
  expect(adminLocation.get().status).toBe('timeout');
  expect((await adminLocation.requireValid()).timestamp).toBe(later);
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
});

test('late callbacks cannot restore location after sign-out', async () => {
  let complete;
  geo.getCurrentPosition.mockImplementation(ok => { complete = ok; });
  const pending = adminLocation.requireValid();
  await flush(); adminLocation.stop(); complete(fix());
  await expect(pending).rejects.toMatchObject({ code: 'LOCATION_REQUIRED' });
  expect(adminLocation.get().status).not.toBe('available');
  permission.state = 'granted'; permission.onchange();
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
});
