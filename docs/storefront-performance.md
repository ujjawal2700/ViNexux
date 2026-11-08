# Storefront performance improvements

## What changed

- Existing Diwali campaign URLs automatically render optimized WebP artwork. The three public PNGs total 3,676,700 bytes; their optimized copies total 58,090 bytes (98.4% smaller). Custom uploaded decorations retain their URLs and framing. Original files remain available to existing campaigns/admin previews.
- Unsigned original Cloudinary images receive `f_auto,q_auto,c_limit` transformations and responsive width candidates. Banners, product cards, shared image components, brand logos and header logos select an appropriate size. Local/custom-provider/signed/already-transformed URLs are preserved.
- First banner images/posters load eagerly with high priority. Inactive slides have no image source or source set until selected. Slow or data-saving connections pause automatic rotation, while navigation buttons remain usable. Existing video thumbnail/stable-connection behavior is retained.
- Banner metadata is requested alongside the theme and shared with the homepage. Brand callers share an in-flight/briefly cached request; admin mutations invalidate the cache.
- The homepage keeps its banner mounted while catalog requests finish, reserves minimum page height, and shows product skeletons below it. The first theme resolves before the themed shell mounts, avoiding the default-to-festive header jump. Theme lookup has a three-second timeout and falls back to the default if unavailable.
- Firebase's SDK and product-list/detail pages load on demand instead of in every initial homepage bundle. The main JavaScript file falls from about 525 KB to 365 KB before compression (31% smaller); other shared chunks still exist. Exact filenames/sizes change on each build.
- Carousel widths are measured on resize rather than on every animation frame. Brand animation respects reduced motion and pauses in hidden tabs.

## Required VPS configuration

**Deploying the frontend alone does not enable Nginx caching or gzip.** The live review found no `Cache-Control` for `/assets/` and `/theme-assets/`, and no gzip for JavaScript even when accepted by the client.

For an existing VPS setup, merge the directives in `backend/deploy/storefront-performance.nginx.conf` into the active storefront server block, including the HTTPS block. Replace existing gzip and `/assets/` directives instead of duplicating them. Keep API, sitemap, SEO-renderer, PWA and authentication routing intact. This snippet requires no optional Brotli module. The complete example in `backend/deploy/nginx.conf.example` also includes these settings.

After backing up the active server configuration:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Reload only if the validation passes. Nginx is not installed in the development workspace, so production configuration validation/reload must happen on the VPS.

Verify with a current hashed asset URL from the deployed HTML:

```sh
curl -I -H 'Accept-Encoding: gzip' https://vinexus.in/assets/CURRENT-BUILD-FILE.js
curl -I https://vinexus.in/theme-assets/diwali/header-marigold-v1.webp
```

JavaScript should include `Content-Encoding: gzip`, `Vary: Accept-Encoding`, and a year-long immutable cache policy. Theme artwork should have a seven-day public cache policy. Use a new versioned artwork filename when replacing a bundled image. The rules do not cache API responses, sessions, or account data. Retain no-cache behavior for HTML and service workers.

## Validation and limits

- Unit coverage checks transformation safety and legacy campaign artwork mapping.
- Production-browser checks cover responsive image selection, inactive slide deferral, slow-network navigation, deduplicated public requests, stable banner mounting, festival rendering, notifications, privacy consent and storefront behavior.
- Real Cloudinary checks returned HTTP 200: one banner decreased from 120,861 to 44,092 bytes at width 640; one product image decreased from 127,248 to 23,153 bytes at width 320. Results depend on the image and the visitor's viewport/pixel density.
- Build, lint and repository integrity checks are run before pushing. Existing lint warnings remain.
- These measurements are not a new live PageSpeed score. Redeploy the frontend and apply/reload the Nginx configuration before retesting mobile and desktop PageSpeed. No score or response-time guarantee is implied.
