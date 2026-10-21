# Sharing previews, manual low stock, sessions and dispatch notice

## Behavior

Product URLs now receive initial HTML containing the product title, description and primary gallery photo in Open Graph and Twitter metadata. This includes `/products/:id`, brand URLs and category hierarchy URLs. Existing generic image tags and their dimensions/types are removed from product responses. Products without a photo have no social image, rather than the generic site photo. Non-product pages receive the generic social image configured in Website Settings. Text is HTML-escaped and image URLs are limited to HTTP(S).

The React settings provider also respects product-owned metadata when its settings response arrives later. Moving from a product to another page restores the configured generic image.

`Product.isLowStock` is an explicit boolean with a default of false. Admins can toggle it beside Trending in the product list or in product editing. Neither a small inventory count nor a stock update automatically enables it. Low Stock catalog filters use this flag. Stored catalog fields are version 3; the existing startup backfill removes the previous automatic quantity-based status from legacy products.

Manually flagged products have a maximum of five units per cart line/enquiry, capped by available stock when positive. Thus stock 3 allows 3 and stock 6 allows 5. Positive stock limits remain enforced on the server when adding/updating cart lines and when submitting an enquiry, including carts created before a flag change. Zero-stock items still support availability enquiries; they do not permit order fulfillment or reserve inventory. The existing completion and POS inventory guards remain unchanged. The cart API includes the flag so client quantity controls use the same policy.

The admin session API identifies the requesting browser's session from its authenticated server session. It is pinned first on page one, with pagination offsets adjusted to avoid omissions/duplicates. Filters continue to apply. The current row says “Current session · This browser” and omits Force Revoke; the server also rejects revoking it through that action. Log out remains available. Other sessions can still be revoked. A second browser sees its own session pinned instead.

The cart says that orders before 5:00 pm IST dispatch the same day, and orders at or after 5:00 pm IST dispatch the next day.

## Hosting

Changing browser metadata alone did not fix initial sharing HTML. Both checked-in hosting configurations now route page requests through a renderer while serving assets normally:

- **Vercel:** `frontend/api/page.js` reads the built `dist/index.html`, fetches public website settings/product details, and injects metadata before returning the full app shell. `frontend/vercel.json` includes that HTML in the function. Root and direct index requests are routed explicitly before filesystem matching; remaining page paths fall back to the function. The existing security headers are preserved. Use the existing absolute `VITE_API_BASE_URL` ending in `/api`, or `API_BASE_URL` for a server-only override. Optional `PUBLIC_SITE_URL` sets the canonical origin; otherwise the serving host is used. Failed metadata requests are not CDN-cached and cannot substitute the generic photo for a product. Successful responses have a short public cache.
- **nginx/VPS:** apply the updated `backend/deploy/nginx.conf.example`. Its page fallbacks use `/api/share-page`, which reads `frontend/dist/index.html` from the same checkout and resolves public catalog/settings data directly. Keep the frontend build available beside the backend. Assets are still served by nginx.

These routes are based on Vercel's documented [filesystem/routing precedence](https://vercel.com/docs/project-configuration/vercel-json) and [function includeFiles configuration](https://vercel.com/docs/project-configuration/vercel-json#functions).

Changes are local; both application code and the appropriate hosting configuration need deployment. No production database or live messaging service was used for testing.

## Verification

- 412 unit tests passed, including metadata escaping, all product URL forms, generic/non-product previews, missing photos, metadata outages, manual flags, and quantity boundaries.
- 232 API tests passed.
- 13 browser tests passed across storefrontControls and inquiryLogin, covering toggles/reload, stock 3 and 6, ordinary small inventory, session markers, dispatch copy, delayed CMS metadata, navigation, and the preceding inquiry/OTP changes.
- Real HTTP/database suites passed: storefrontControls, adminSession, catalogIntegration and inquiryFlow. Session tests switch between two authenticated browser sessions, verify all 26 records across pagination, protect self-revocation and revoke another device. Sharing tests inspect the initial HTTP HTML with a crawler user agent, without running JavaScript.
- The Vercel page handler was separately invoked with the production-built app shell and mocked public APIs; product and non-product HTML checks passed.
- Production build, lint (warnings only) and git diff --check passed.

A React development render-depth warning appeared once during the parallel browser run; the isolated session-page rerun passed without reproducing it. The warning did not fail the functional checks.
