/* Firebase public browser configuration is passed by the registration URL. */
const safeUrl = value => { try { const url = new URL(value || '/', self.location.origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : self.location.origin; } catch { return self.location.origin; } };
// Register before importing Firebase so our action links handle notification clicks.
self.addEventListener('notificationclick', event => {
  if (event.notification.data?.FCM_MSG) return; // Firebase handles automatically displayed transactional notifications.
  event.notification.close();
  const data = event.notification.data || {};
  const target = safeUrl(data.actions?.find(action => action.action === event.action)?.url || data.link);
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const existing = windows.find(client => client.url === target);
    if (existing) return existing.focus();
    return clients.openWindow(target);
  }));
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');
const config = JSON.parse(new URL(self.location.href).searchParams.get('config') || '{}');
if (config.apiKey && config.projectId) {
  firebase.initializeApp(config);
  firebase.messaging().onBackgroundMessage(payload => {
    // FCM automatically displays notification payloads. Campaigns use data-only messages.
    if (payload.notification) return;
    const data = payload.data || {};
    if (data.expiresAt && Number(data.expiresAt) < Date.now()) return;
    let actions = [];
    try { actions = JSON.parse(data.actions || '[]').slice(0, 2).map((action, i) => ({ action: `action-${i}`, title: action.label, url: safeUrl(action.url) })); } catch { /* optional actions */ }
    return self.registration.showNotification(data.title || 'ViNexus', {
      body: data.body || '', icon: data.iconUrl ? safeUrl(data.iconUrl) : '/logo.png',
      ...(data.badgeUrl ? { badge: safeUrl(data.badgeUrl) } : {}), ...(data.imageUrl ? { image: safeUrl(data.imageUrl) } : {}),
      tag: data.tag || undefined, requireInteraction: data.requireInteraction === 'true',
      actions: actions.map(({ action, title }) => ({ action, title })), data: { link: safeUrl(data.link), actions },
    });
  });
}
