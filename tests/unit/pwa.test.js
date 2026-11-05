import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { pwaConfig, renderPwaHtml } from '../../shared/pwa.js';
import { waitForServiceWorkerActivation } from '../../frontend/src/utils/serviceWorkerActivation.js';
const shell = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
test('admin installation metadata is available in the initial server HTML without JavaScript', () => {
  const html = renderPwaHtml(shell, '/admin/login');
  expect(html).toContain('<link rel="manifest" href="/admin/manifest.webmanifest"');
  expect(html).toContain('name="application-name" content="ViNexus Admin"');
  expect((html.match(/<link rel="manifest"/g) || []).length).toBe(1);
  expect(pwaConfig('/administrator').manifest).toBe('/manifest.webmanifest');
  expect(pwaConfig('/admin/profile').manifest).toBe('/admin/manifest.webmanifest');
});
test('notification registration waits for its own worker, rather than the admin controller', async () => {
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const registration = { installing: worker };
  let resolved = false;
  const promise = waitForServiceWorkerActivation(registration).then(value => { resolved = true; return value; });
  await Promise.resolve(); expect(resolved).toBe(false);
  worker.state = 'activated'; worker.dispatchEvent(new Event('statechange'));
  expect(await promise).toBe(registration);
});
test('failed notification-worker installation reports failure without hanging', async () => {
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const promise = waitForServiceWorkerActivation({ installing: worker });
  worker.state = 'redundant'; worker.dispatchEvent(new Event('statechange'));
  await expect(promise).rejects.toThrow('could not activate');
});
