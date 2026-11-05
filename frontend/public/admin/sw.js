const CACHE = 'vinexus-admin-offline-v1';
const OFFLINE = '/admin/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(OFFLINE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vinexus-admin-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || !url.pathname.startsWith('/admin/')) return;
  // Admin HTML and API data always come from the network. Only a generic,
  // account-free offline page is cached; authenticated records are never cached.
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
});
