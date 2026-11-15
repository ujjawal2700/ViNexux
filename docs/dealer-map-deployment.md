# Dealer office map deployment

On 15 November 2026, the live `/register` page returned `Referrer-Policy: no-referrer` and loaded `OfficeLocationPicker-DCsTZTk6.js`, which still used the legacy `{s}.tile.openstreetmap.org` URL without an explicit image referrer policy. It did not include the prior map fix.

The backend Helmet configuration now uses `strict-origin-when-cross-origin`. This sends only the site origin for cross-origin HTTPS requests. Map images and location-search requests also explicitly use this policy. The map uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with visible attribution.

Deploy the reviewed backend and rebuild/deploy the frontend from the same reviewed revision. Restart the backend processes so the Helmet change takes effect. If nginx overrides Referrer-Policy, use `strict-origin-when-cross-origin` there as well. Avoid deploying only an older pinned revision.

After deployment, verify `/register` returns the expected referrer policy; its loaded map bundle contains the canonical tile URL, explicit referrer policy and tile failure message. In browser Network tools, confirm tile requests contain `Referer: https://vinexus.in/` and return real map images. A browser refresh alone cannot update an old server-side build. The public OSM tile service can still block a network or origin independently; if correctly identified requests remain blocked, configure a suitable tile provider through `VITE_MAP_TILE_URL` and `VITE_MAP_TILE_ATTRIBUTION` and rebuild.

Regression coverage checks the backend response header and simulates both successful tiles and HTTP 403 tiles under a page-level `no-referrer` policy. Browser tests mock provider responses; they do not claim to verify production availability.
