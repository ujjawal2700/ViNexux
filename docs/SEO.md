# ViNexus search and Analytics setup

The canonical public origin is https://vinexus.in. Search Console verification is permanently included in the initial HTML:

```html
<meta name="google-site-verification" content="BIdzIKiLz_srzFwDsNbqfYMPkuBRJpeEJhTRNMotlqU" />
```

## What is generated

- `/robots.txt` allows public pages and resources and references the canonical sitemap. Private HTML uses `noindex` rather than relying on robots.txt to prevent indexing.
- `/sitemap.xml` is a live sitemap index. `/sitemap-pages.xml` lists public static pages, active reachable categories, available brands and published CMS pages. `/sitemap-products-N.xml` lists published products in batches of 1,000, with actual modification dates and product images. Draft products and inactive category branches are excluded. `/sitemap.sxml` redirects to the standard `.xml` spelling.
- All HTML routes use the existing server page renderer. Public routes receive a descriptive title, description, canonical link, social metadata, semantic heading/content and crawlable links in the initial response, before JavaScript. Products also receive Product and BreadcrumbList JSON-LD. React replaces the initial content with the interactive storefront.
- Product aliases use the catalog's category URL as their canonical URL. A category-free product uses `/products/:id`. Tracking parameters are removed from canonicals. Search/filter variants and private/utility pages are marked `noindex`.
- Missing products, categories, brands and CMS pages return HTTP 404. Temporary maintenance returns HTTP 503 with `Retry-After: 60`, rather than a cacheable empty page or permanent removal signal.
- Google Analytics uses the confirmed ID `G-L1LPWYW2V6`. It loads once only after **Allow optional storage**. Existing saved preferences without an explicit analytics choice do not opt users in. Essential-only choices disable collection and clear GA cookies. Admin/account/invoice/auth pages and functional query URLs are excluded. Enhanced measurement owns SPA history views; the app does not also send manual `page_view` events. Advertising features are disabled.

Public Product markup intentionally omits login-only prices, zero-price offers and invented ratings. Products can be indexed normally, but Google price/review rich results require genuine qualifying public data. The markup does not promise rich-result eligibility or ranking.

## Deployment

Deploy backend and frontend together. The new public API routes are `/api/seo/page?path=/...` and `/api/seo/sitemap*.xml`.

For Vercel, the tracked `frontend/vercel.json` routes sitemaps to `api/sitemap.js` before filesystem handling, and HTML through `api/page.js`. Configure `VITE_API_BASE_URL` (or server-only `API_BASE_URL`) with the public backend URL ending in `/api`. The HTML function needs the built `dist/index.html`, already included in configuration. Preview deployments send `X-Robots-Tag: noindex`.

For nginx, apply the sitemap locations in `backend/deploy/storefront-pages.nginx.conf` (or the updated complete example), preserving existing asset and API locations. Build `frontend/dist` on the same host as the backend, run `nginx -t`, then reload. A static-only SPA fallback will not provide the new initial HTML or dynamic sitemap behavior. Ensure the hosting/domain settings redirect the alternate www hostname and HTTP to the canonical HTTPS origin without a redirect loop.

## Google checks after deployment

1. Inspect the source of https://vinexus.in/ and confirm the exact verification tag. In Search Console, select the https://vinexus.in/ URL-prefix property and click **Verify**. Keep the tag after verification.
2. Open https://vinexus.in/robots.txt and https://vinexus.in/sitemap.xml. Follow the page and product sitemap links; responses must be XML, not the SPA shell.
3. Submit `sitemap.xml` in Search Console's Sitemaps panel. Use URL Inspection on the homepage, a category, a brand and a product, then request indexing where appropriate. Google decides if and when pages are indexed; submission does not guarantee placement or ranking.
4. In Analytics, confirm measurement ID `G-L1LPWYW2V6`, keep Enhanced Measurement's history-based page views enabled, and use Realtime/DebugView after accepting optional storage. Browse between public pages and confirm each view is counted once. Private and essential-only visits should not be collected. Do not add a second GTM/gtag installation or separate manual page-view tracking.
5. Recheck Page indexing, selected canonical URLs, Core Web Vitals and enhancement reports as Google crawls the site. Use the Rich Results Test to inspect product/breadcrumb markup; missing price/review eligibility is expected while prices require sign-in.

References: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [GA4 single-page apps](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).
