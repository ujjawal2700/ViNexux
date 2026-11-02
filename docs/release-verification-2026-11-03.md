# Full regression verification — 3 November 2026

The tests have been updated for product drafts, admin-selected New Arrivals, normal New Arrivals product cards with automatic sliding, storefront gallery layout/zoom, full-screen admin catalogue/editor image previews, Google Sheet product management, separate manual filter management, and clearing filters when editing or repeating a search.

This audit ran the complete automated unit, API, database integration, development-browser, and production-browser suites against the combined local changes. No test failures were found. These results apply to the local source and compiled frontend, not a production deployment.

## Results

| Check | Result |
| --- | --- |
| Unit tests | 527 passed across 51 suites |
| API tests | 269 passed across 7 suites |
| Backend database integration files | 37 passed in one complete run, with database cleanup verified |
| Standalone frontend storage-consent test | 1 passed |
| Development browser tests, Chromium | 259 passed, no skips |
| Production-build browser tests, Chromium | 248 passed; 11 intentional skips |
| Frontend production build | Passed |
| Frontend lint | Passed with 0 errors and 170 existing warnings |
| Syntax and whitespace checks | 266 backend/shared JavaScript files passed syntax checks; diff whitespace check passed |
| Live Firebase service-account authentication | Passed, read-only |
| Firebase official browser configuration | All seven checked fields match, including the API key |
| Live Cloudinary authentication | Passed using the read-only API ping |

The production-only skips are the existing Firebase development-adapter injection tests in `customerPushConsent.spec.js` (6), `pushReception.spec.js` (2), and `pushTokenStorage.spec.js` (3). All 11 passed in the full development-browser run. They are skipped against compiled assets because their injection mechanism targets development source modules.

This final rerun covered all current test files: 51 unit, 7 API, 37 backend integration, 39 browser, and 1 standalone frontend test file. No application or test changes were needed during this rerun. The initial API invocation was blocked by the sandbox's local-listener restriction; the complete API suite passed after local HTTP listeners were permitted.

## Added verification and test infrastructure

`backend/tests/productSheetIntegration.test.js` now exercises the new draft and Google Sheet workflow through real Express HTTP and MongoDB writes. Only Google's network transport is simulated. It verifies:

- Completely blank draft creation; incomplete specifications and price updates; required publication validation; public draft exclusion.
- Initial sheet export, preserving existing workbook tabs.
- Updating prices and New Arrival selections; price history attribution to the authenticated admin.
- Creating new sheet products, writing stable IDs back, repeated-sync idempotency.
- Merging unrelated catalogue edits and rejecting conflicts on the same field.
- Retrying a Google write failure after a database change without duplicate prices or products.
- Real database lock contention and persisted sync records.

The existing recently added unit/API/browser tests also passed in the broad runs. These cover image viewers and keyboard navigation, unsaved local image previews, gallery editing controls, responsive side thumbnails, preventing arrow-hover zoom, unlimited selected carousel products, normal New Arrivals cards, and Google Sheet setup/sync/error states.

The integration runner now explicitly clears Google product-sheet service credentials in its child environments, alongside its existing provider isolation. This keeps future database tests isolated from live Google credentials.

A reusable `test:providers` command was added. By default it checks configuration and PEM validity without contacting providers. With `--live`, it performs read-only Firebase authentication/configuration comparison and Cloudinary API authentication. It never prints secrets, access tokens, or raw provider errors, and never sends email, SMS, push notifications or campaigns.

## Limits and remaining setup

- Google Sheets service-account credentials are missing locally, so live Google spreadsheet access and real synchronization remain unverified. Automated Sheet tests use simulated Google transport, including the real-HTTP/database integration above.
- SMTP and SMS credentials are incomplete/missing. No live email or SMS delivery was tested.
- Firebase and Cloudinary authentication checks do not establish push receipt, image-upload delivery, or production runtime configuration. The Firebase browser API key was compared to the current official web-app configuration; no notification was sent.
- Chromium desktop/mobile emulation was exercised. Safari, Firefox, physical mobile devices and load testing were not included.
- Lint warnings and the existing build chunk-size warning remain; functional test success does not resolve them.

## Isolation and cleanup

Database tests used an owned temporary MongoDB replica set, `vinexusAccessTest`, on `127.0.0.1:27019`. The guard redirected connections to disposable named test databases. All test database cleanup was verified, and the temporary MongoDB server was stopped afterward. Production business data was not used. The browser suites use mocked application APIs; the separate integration suites exercise actual backend/database behavior.

## Reproduce

```sh
npm run test:unit
npm run test:api
npm run test:integration
npm run test:e2e
npm run test:e2e:production
node --test frontend/tests/storageConsent.test.js
npm --prefix frontend run lint
npm run test:providers
npm run test:providers -- --live
```

The integration command requires the disposable local replica set described above. The live provider command needs configured credentials and outbound access; it reports missing integrations rather than claiming they were tested. The full audit did not deploy changes.

## Follow-up: separate manual filter management

The latest complete rerun includes the manual-filter redesign and search reset follow-up. The manual-filter integration verifies actual HTTP/database assignment behavior and permissions. Desktop/mobile browser regressions verify immediate reset when editing the search text, repeated and empty search-button submissions, Enter submissions, returning from category/brand routes to global search, and applying filters again afterward. The table above records the final combined results.

[Manual filter workflow and implementation](manual-product-filters-2026-11-03.md) documents the retained Brands/Categories/Main Categories groups, explicit option-to-product assignments, three display types, removed form controls, and the updated browser/database regressions.

## Final rerun evidence

The complete development browser run used two workers and the production run used one worker, separate local ports, separate reports, and separate artifact directories. Both used a 90-second per-test limit. The temporary MongoDB server was confirmed to have zero remaining ViNexus test databases and shut down cleanly.

- Unit: `/tmp/vinexus-final-audit-unit.log`
- API: `/tmp/vinexus-final-audit-api-permitted.log`
- Database integration: `/tmp/vinexus-final-audit-integration.log`
- Per-file database results: `/var/folders/14/2hy6zb5s4fjfnfdvh9jb175r0000gn/T/vinexus-full-integration-PLtSZi/results.json`
- Development browser: `/tmp/vinexus-final-audit-e2e-dev.log`
- Production build/browser: `/tmp/vinexus-final-audit-e2e-production.log`
- Standalone storage test: `/tmp/vinexus-final-audit-storage.log`
- Lint: `/tmp/vinexus-final-audit-lint.log`
- Read-only live provider checks: `/tmp/vinexus-final-audit-providers.log`
