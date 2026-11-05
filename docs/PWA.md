# Installing the ViNexus admin app

The repository previously had no linked web app manifest, explicit app identity or install-sized app icons. Some Android browser versions can create shortcuts or install a generic site without a manifest; that does not establish a separate, consistently installable admin app. The existing Firebase worker was only registered after notification permission, so it was not a general admin installation/offline setup.

The storefront and admin panel now have distinct manifests and stable identities:

| App | Manifest | ID | Launch URL | Scope |
| --- | --- | --- | --- | --- |
| ViNexus | `/manifest.webmanifest` | `/` | `/` | `/` |
| ViNexus Admin | `/admin/manifest.webmanifest` | `/admin/` | `/admin/login` | `/admin/` |

Both provide standalone display, 192px/512px PNG icons and a padded maskable icon. The server's initial HTML selects the appropriate manifest. Client-side navigation updates it too. Admin launches still use the existing authentication and role checks; installation does not bypass login.

An automatically registered `/admin/sw.js` worker controls only `/admin/`. It uses the network for navigation and caches only `/admin/offline.html`, a generic reconnect screen. It does not cache admin HTML, API responses or account records. Firebase retains its existing root registration for push. Push registration waits for that specific worker to activate, rather than using `navigator.serviceWorker.ready`, which may resolve to the admin controller instead.

## Deploy and check on Android

1. Deploy the frontend build and updated page-rendering code together. The new files in `frontend/public/admin` and `frontend/public/pwa` must be deployed with it.
2. Serve the site over valid HTTPS. The tracked Vercel configuration and nginx examples serve manifests as `application/manifest+json` and the worker as JavaScript, without SPA fallback or authentication. Manifests and the worker use `no-cache` headers to pick up updates.
3. Open `https://vinexus.in/admin/login` in Android Chrome and reload after deployment. Use Chrome's menu → **Add to Home screen** → **Install** (wording depends on Chrome version). The installed app should be identified as ViNexus Admin and launch the admin login or authenticated admin panel.
4. If Chrome is still using old metadata, close and reopen that tab and retry. Existing storefront installation does not share the new admin app ID.
5. Check DevTools → Application → Manifest and Service Workers if installation still fails. Manifests, all icons and `/admin/sw.js` must return their actual files with HTTP 200, not an HTML login or SPA fallback. Never put access tokens or other secrets in a manifest/start URL.

Automated checks cover Chromium with a Pixel 7 device profile: manifest parsing, zero browser-reported installability errors, actual PNG dimensions, worker control, distinct identities on SPA navigation, generic offline fallback and cache contents. These checks do not exercise Android's native WebAPK packaging/OS installer on a physical phone; that final check requires the deployed HTTPS site and the device.

References: [Google manifest guidance](https://web.dev/articles/add-manifest), [Chrome installability changes](https://developer.chrome.com/blog/update-install-criteria).
