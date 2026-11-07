import { afterEach, expect, jest, test } from '@jest/globals';
import { clearPublicRequests, publicRequest } from '../../frontend/src/utils/publicRequests.js';
afterEach(() => { clearPublicRequests(); jest.restoreAllMocks(); });
test('public content callers share one request, including staggered layout/page mounts', async () => {
  const loader = jest.fn(async () => ({ names: ['Cameras'] }));
  const [a, b] = await Promise.all([publicRequest('categories', loader), publicRequest('categories', loader)]);
  expect(a).toEqual(b); expect(await publicRequest('categories', loader)).toEqual(a); expect(loader).toHaveBeenCalledTimes(1);
});
test('failed requests are retriable, expiry refreshes data and admin invalidation removes stale content', async () => {
  let now = 0; jest.spyOn(Date, 'now').mockImplementation(() => now);
  const loader = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('fresh');
  await expect(publicRequest('footer', loader, 100)).rejects.toThrow('offline');
  await expect(publicRequest('footer', loader, 100)).resolves.toBe('fresh');
  now = 101; await publicRequest('footer', loader, 100); expect(loader).toHaveBeenCalledTimes(3);
  clearPublicRequests(); await publicRequest('footer', loader, 100); expect(loader).toHaveBeenCalledTimes(4);
});
