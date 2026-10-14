# Website verification — 14 October 2026

All automated suites listed below passed after fixes. This is broad regression coverage, not proof that every possible input, browser, device or production failure has been tested.

## Results

| Check | Result |
| --- | --- |
| Jest unit tests | 331 passed, 31 suites |
| Jest API tests | 228 passed, 5 suites |
| Playwright Chromium browser tests | 161 passed, no skips; final push/campaign rerun: 7 passed |
| MongoDB backend integration files | 28 passed, no omitted test files |
| Frontend production build | Passed |
| Frontend lint | No errors; 162 warnings remain |
| Whitespace/conflict diff check | Passed |
| Live Firebase service-account authentication | Passed |
| Official Firebase web-app configuration comparison | All seven public settings match |
| Live admin-only Firebase test | 1 accepted, 0 failed; browser display not independently confirmed |

The route inventory covers 98 frontend routes: 29 storefront, 18 compatibility redirects, 5 customer authentication, 8 account, 4 admin authentication and 34 admin routes. The API inventory verifies mounting for 194 method/path pairs. Route smoke tests establish that a route renders or is mounted; they do not establish every business behavior for that route.

## Coverage

- Storefront: homepage banners, trending products, brands, category hierarchies, product listing/detail/search/filter/sort, footer, static pages, mobile layouts and failure states.
- Accounts: current phone-first signup, legal consent, customer/dealer login, admin login, OTP validation, session conflicts, refresh/logout, blocked accounts, profile, enquiry history, invoices and notification preferences.
- Administration: dashboard, categories/products/HSN/import/images/prices/stock, brands, dealer KYC and dealer pricing, customers, B2C/B2B enquiries, sessions, reports, team permissions, role deletion, categorized sidebar/search, profile, themes, banners, promotional cards, settings, static pages and footer.
- Permissions and audit: denied reads/writes, write-only response redaction, role changes, assigned-role deletion constraints, precise before/after stock changes, location metadata, concurrent changes and rollback when the audit journal fails.
- POS: checkout/recovery/held bills/mobile UI; real MongoDB checkout transactions, concurrent request idempotency, insufficient-stock rollback, HSN lookup, invoice PDF, customer ownership, returns, voids, refunds, Excel export and audit records.
- Marketing: email composition/HTML sanitization/images, push composition/URLs/actions/TTL, inline validation, audience review, opt-in/out/unsubscribe, transactional queuing, duplicate prevention, cancellation, stale processing jobs, admin-only tests, token ownership, Firebase batching and invalid-token handling.
- Integrations: development/mocked email, SMS, Google Sheets, WhatsApp and storage providers, failure isolation and security checks. These automated tests do not contact customers or external messaging services.

## Fixes found during this audit

1. A force-login conflict ticket could be reused to revoke a replacement session. Consuming the exact old session and creating its replacement now happen in one MongoDB transaction. Sequential replay and simultaneous takeover requests are tested.
2. The `/trending` route wrapper discarded its filtering prop. It now forwards that prop; its duplicate route declaration was removed and duplicate paths have a regression test.
3. The catalog accepted `inStock` but ignored it. The query now filters stored stock levels.
4. Trending auto-scroll could continue after reduced-motion was enabled during a smooth scroll. The carousel now stops the animation immediately.
5. Default footer order differed between data defaults and rendered layout. Defaults now agree while saved custom order is preserved.
6. Firebase Admin SDK usage relied on a removed namespace API. It now uses the installed modular app and messaging APIs, covered by provider tests.
7. The supplied frontend API key was rejected by Firebase. The key was corrected using the service account's authenticated read of the official web-app configuration; all public fields were compared without logging their values.
8. Cached revoked browser tokens could survive explicit registration. Explicit enabling first attaches the configured service worker, then renews the token. Adapter tests reproduce the installed SDK's default-worker fallback and verify the corrected call order.
9. Foreground reception checked only `_id` although login supplies `id`, and registration could run before session restoration. The hook now accepts either identifier and waits for authentication. Admin/customer browser tests verify foreground notifications, safe action links and expiry.
10. An old unique `pushdevices.token` index prevented a second hash-based registration. A narrowly scoped migration removes only that obsolete index; a real-database regression recreates the old index and verifies recovery.
11. Transactional push counts included temporary failures as delivered. Counts now use Firebase's accepted-device count, and development simulations report zero actual sends.
12. Older tests used obsolete signup, dealer-profile, enquiry, product and snapshot contracts. Fixtures now supply valid current inputs; tests still exercise actual section HTTP APIs and verify the current business contract.
13. Backend tests were not included in the root full-test command. The full command now includes every backend test file through an isolated runner. Nonzero exits, timeouts and legacy assertion-failure output fail the run.

## Live Firebase test and remaining external checks

The super-admin browser was registered through the admin campaign editor. Firebase dry-run validation found one valid browser and one revoked old token. Only the valid super-admin token received the requested test, titled **ViNexus admin push test**. Firebase returned one accepted message and zero failures. A second verification through the real campaign delivery path, including an action link, also returned one accepted browser and zero failures. The revoked admin token was then pruned; no customer/dealer devices were contacted. OS notification display and user receipt remain unconfirmed, so provider acceptance is not described as verified on-screen delivery.

The campaign studio currently reports **SMTP setup needed**. Email rendering, sanitization, queueing and SMTP adapter behavior passed automated tests; real email inbox delivery has not been verified. Real SMS, Google Sheets, WhatsApp and production cloud-storage delivery were not exercised during this audit. Chromium desktop/mobile emulation was tested; Safari, Firefox, real mobile operating systems, sustained load and production deployment were not tested.

Lint's 162 warnings are predominantly React effect/dependency, export and unused-variable warnings. The build also reports a large-chunk warning. Neither is represented as resolved by passing functional tests.

The foreground notification also avoids rendering a broken image or link when an optional URL is blank.

## Reproduce

From the repository root:

```sh
npm run test:unit
npm run test:api
npm run test:integration
npm run test:e2e -- --workers=1
npm --prefix frontend run lint
npm --prefix frontend run build
```

`npm run test:all` runs unit, API, backend integration and browser suites. `npm --prefix backend run test:all` runs all backend test files. A particular backend file can be selected with `node backend/tests/runAll.js auth.test.js`.

Backend integration requires a disposable local MongoDB replica set at `127.0.0.1:27019`, named `vinexusAccessTest`. Start `mongod` with a temporary database directory, `--port 27019 --bind_ip 127.0.0.1 --replSet vinexusAccessTest`, then initialize that replica set before running tests. Do not point this workflow at a business database. The runner preloads a database guard, redirects connections to this local replica set, uses named disposable databases, forces development messaging providers, clears real provider credentials in child processes and drops only recorded test databases afterward. The temporary MongoDB instance used for this audit is stopped after verification.

API/browser tests need permission to open local HTTP listeners. The audited run used Node 24 and the repository's installed dependencies. Browser tests use mocked APIs; the separate MongoDB integration suites exercise the real Express services and database.
