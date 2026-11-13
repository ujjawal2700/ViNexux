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

For Vercel, the tracked `frontend/vercel.json` routes sitemaps to `api/sitemap.js` before filesystem handling, and HTML through `api/page.js`. Configure `VITE_API_BASE_URL` (or server-only `API_BASE_URL`) with the public backend URL ending in `/api`. The existing HTML catch-all also dispatches sitemap paths to the XML adapter, so a missing dedicated rewrite cannot turn sitemap requests into React 404 pages. The HTML function needs the built `dist/index.html`, already included in configuration. Preview deployments send `X-Robots-Tag: noindex`.

For nginx, the existing `/api/share-page?path=/sitemap.xml` fallback now serves XML directly, including all child sitemaps. This handles VPS installations that already use the HTML renderer but did not apply separate sitemap rules. Deploy the updated backend and reload the API process; a frontend rebuild alone does not update this backend controller. Explicit sitemap routing is still supported: apply the sitemap locations in `backend/deploy/storefront-pages.nginx.conf` (or the updated complete example), preserving existing asset and API locations. Build `frontend/dist` on the same host as the backend, run `nginx -t`, then reload. A static-only SPA fallback will not provide the new initial HTML or dynamic sitemap behavior. Ensure the hosting/domain settings redirect the alternate www hostname and HTTP to the canonical HTTPS origin without a redirect loop.

## If `/sitemap.xml` shows the storefront 404 screen

The live check on 6 November 2026 found that `/sitemap.xml` returned HTTP 404 with server-rendered HTML, while `/api/seo/sitemap.xml` and `/api/seo/sitemap-pages.xml` returned HTTP 200 with valid XML. nginx was routing the public URL through the page fallback. The generator was already working.

The page fallback now recognizes sitemap filenames **before** rendering HTML and calls the same XML controller as the direct API. Deploy the backend fix and reload PM2 from the deployed `backend` directory:

```sh
pm2 reload ecosystem.config.cjs --env production
curl -i https://vinexus.in/sitemap.xml
curl -i https://vinexus.in/sitemap-pages.xml
curl -i https://vinexus.in/sitemap-products-1.xml
```

All three public URLs must return HTTP 200 with `Content-Type: application/xml`, not the storefront HTML. Do not submit only the API index as a workaround: its child links use the canonical public sitemap URLs and those must work too. Regression checks reproduce nginx's catch-all without any sitemap-specific location block, including XML content, missing partitions, the spelling redirect and maintenance responses.

## Google tag checker and strict opt-in

The deployed bundle contains `G-L1LPWYW2V6`. The initial HTML deliberately does not load the external Google library until the visitor chooses **Allow optional storage**. This is basic consent mode. Google's automatic installation checker may not accept the banner and may report that the tag was not detected; that alone does not establish a missing or incorrect tag.

Strict opt-in was explicitly retained. To test actual measurement, open the website, use **Storage choices** in the footer if the banner is already dismissed, choose **Allow optional storage**, and inspect Tag Assistant or this property's Realtime report. Check that `gtag/js?id=G-L1LPWYW2V6` loads and that Google receives a `page_view` event with this ID. Essential-only and private-page visits remain excluded. Browser tracking blockers may prevent measurement. The Google installation-check warning is not a reason to enable pre-consent collection.

Reference: [Google's basic versus advanced consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode).

## Google checks after deployment

1. Inspect the source of https://vinexus.in/ and confirm the exact verification tag. In Search Console, select the https://vinexus.in/ URL-prefix property and click **Verify**. Keep the tag after verification.
2. Open https://vinexus.in/robots.txt and https://vinexus.in/sitemap.xml. Follow the page and product sitemap links; responses must be XML, not the SPA shell.
3. Submit `sitemap.xml` in Search Console's Sitemaps panel. Use URL Inspection on the homepage, a category, a brand and a product, then request indexing where appropriate. Google decides if and when pages are indexed; submission does not guarantee placement or ranking.
4. In Analytics, confirm measurement ID `G-L1LPWYW2V6`, keep Enhanced Measurement's history-based page views enabled, and use Realtime/DebugView after accepting optional storage. Browse between public pages and confirm each view is counted once. Private and essential-only visits should not be collected. Do not add a second GTM/gtag installation or separate manual page-view tracking.
5. Recheck Page indexing, selected canonical URLs, Core Web Vitals and enhancement reports as Google crawls the site. Use the Rich Results Test to inspect product/breadcrumb markup; missing price/review eligibility is expected while prices require sign-in.

References: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [GA4 single-page apps](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).

## Sitemap index and Microsoft Clarity

`https://vinexus.in/sitemap.xml` is a sitemap **index**, so its entries link to child sitemaps. Individual website URLs belong in `https://vinexus.in/sitemap-pages.xml`; product URLs belong in `https://vinexus.in/sitemap-products-1.xml` and subsequent numbered files when the active catalog exceeds 1,000 products. The browser's “no style information” notice is normal XML rendering, not a Search Console error. Submit the index URL to Search Console. Keep the child sitemaps publicly reachable. A live read-only check on 7 November 2026 returned HTTP 200 XML for all three files: 105 page/category/brand URLs and 81 product URLs. These counts change with the published catalog; inactive products and private account pages are intentionally excluded.

The official `@microsoft/clarity` package is configured with project ID `z9lnjg4lha`. Its small wrapper is imported dynamically only after the visitor's saved analytics choice is true. The remote Clarity tag is inserted once per document. Consent V2 grants analytics storage and denies advertising storage. Public SPA navigation keeps the same tag; account, checkout, sign-in, admin, invoice, preview and functional-query pages stop recording before navigation. Returning to a public page resumes after its public view is present, including a rapid Back action during a lazy route transition. Withdrawing analytics consent stops recording and clears first-party Clarity cookies. Consent and privacy text now disclose session replays and heatmaps. No customer identifiers are sent through Clarity's Identify API; public account-name labels are masked.

After deployment, allow optional storage on a public page and check for one request to `https://www.clarity.ms/tag/z9lnjg4lha?ref=npm`. Confirm sessions in that Clarity project's dashboard; vendor processing and browser blockers can affect visibility. Essential-only visits and private-page entry visits must not load the tag. The implementation does not use pre-consent cookieless collection.

References: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Microsoft Clarity NPM integration](https://clarity.microsoft.com/blog/npm-integration/), [Microsoft consent API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2).

## Indexing audit: 12 November 2026

A read-only live check of all 188 URLs in the public child sitemaps (106 page/category/brand URLs and 82 product URLs) found HTTP 200 responses, indexable robots metadata, matching canonical URLs and initial HTML headings for every URL. This verifies the current HTTP responses; it does not establish what Google last crawled or chose to index.

The browser previously changed catalog URLs containing any query string to `noindex`, including tracking-only `utm_*`, `gclid` and `fbclid` links that the server allowed. Browser and server now share the same robots policy. Tracking-only links remain indexable with a query-free canonical; search/filter variants, private pages and missing pages retain `noindex`. Query-only browser navigation also refreshes the policy.

Deploy the updated frontend and backend together. In Search Console, inspect the affected public URLs and compare the last crawl with a live test before requesting indexing. Intentional private-page `noindex` exclusions and private API robots.txt exclusions should remain. The report's seven excluded URLs cannot be matched to these categories without its affected URL lists; do not remove all exclusions to make the report count zero. “Crawled – currently not indexed” is Google's indexing decision and is not automatically fixed by changing robots metadata or requesting indexing.
