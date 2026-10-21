# Pre-production verification — 21 October 2026

This pass verifies the current local working tree, including the accumulated catalog, image upload, inquiry, authentication, sharing, inventory, session and specification-template changes. Nothing was pushed or deployed.

## Results

| Check | Result |
| --- | --- |
| Unit tests | 437 passed across 41 suites |
| API tests | 236 passed across 5 suites |
| Real HTTP / MongoDB integration | All 33 test files passed (130 Node test cases, with additional assertions inside the legacy scenario tests) |
| Development browser suite | 200 passed; no render-loop console warnings |
| Compiled production browser suite | 195 passed; 5 Firebase source-injection tests skipped here and passed in development |
| Production Vite build | Passed |
| Frontend lint | Exit 0; 166 warnings remain |
| JavaScript syntax | 206 backend, shared and server-rendering modules passed |
| Dependency advisories | Zero reported across root, frontend and backend trees |
| Patch whitespace | `git diff --check` passed |
| Built HTML sharing handler | Product photo, name/model/specifications, generic homepage photo, outage cache handling and missing-configuration response passed |

The first development browser run passed 199 tests but logged a React maximum-update-depth warning on the cart. The cart created a fresh empty array before its response arrived, causing its recommendation effect to set state repeatedly. Filtering cart items now memoizes directly against `cart.items`, including the unresolved state. A new browser regression deliberately delays the cart response and verifies that no render-loop errors occur. The focused eight-test storefront controls suite passed after this fix.

A second failure under parallel browser load exposed campaign validation focus running before React committed its updated form. Focus now runs in a layout effect after the error fields commit. The invoice browser fixture also now derives its local URL from the active server, allowing the same flow to test the compiled production build. Route smoke tests additionally reject React render-loop console errors.

POS checkout also reloaded an already verified customer when reopening payment corrections. A delayed lookup could overwrite an edited address/PIN code. The lookup now retains already resolved customer details; the checkout regression verifies the corrected PIN reaches the sale and the customer is looked up only once.

Jest unit workers and Playwright workers are capped at two. Final checks run sequentially to avoid the resource contention/timeouts seen when broad suites ran concurrently.

## Coverage and boundaries

Browser coverage includes the declared storefront, customer, admin and legacy routes, mobile/desktop search and banners, product gallery editing, SVG QR upload permissions, specification ordering/templates, persistent multi-select filters, inquiry validation and out-of-stock inquiries, OTP auto-verification, recent searches/views, manual low-stock limits, current-session identification, invoices, POS recovery, permissions, logout, CMS and campaigns.

The database suite uses a separate MongoDB replica set on `127.0.0.1:27019`, disposable databases and development providers. Its runner cleans up the test databases; the isolated MongoDB process was stopped afterward. Browser tests mock the API; the separate integration suite exercises real backend HTTP and database behavior. Production business data was not used.

Five Firebase browser tests inject a replacement source module for deterministic push registration, foreground reception, token persistence and logout. They run in the development suite. The production suite explicitly skips these five because compiled bundles do not expose that source-module boundary. The POS rendering-failure fixture works against both the development module and the compiled lazy chunk.

Live Cloudinary credentials, SMS/email delivery, Firebase delivery, Google Sheets, deployed CORS/routing and social-platform preview caches were not exercised against production services. Those require a staging environment with its intended provider configuration. These automated results do not establish live-provider connectivity or production load capacity.

Dependency audits initially found 19 moderate test-tooling findings propagated from `sprintf-js` through `argparse`, `js-yaml` and Jest coverage/configuration packages. A scoped `@istanbuljs/load-nyc-config` override now uses the patched YAML parser without downgrading Jest. Its actual YAML configuration loading is covered by a new regression test. Root, frontend and backend audits all report zero vulnerabilities after the update.

The build still reports a chunk-size advisory above 500 kB. Lint reports existing unused-symbol and React-effect warnings. Neither command reports a blocking error; these warnings remain visible rather than being suppressed.

## Repeatable commands

- `npm test`: all unit and API tests. API tests require local HTTP binding permission.
- `npm run test:integration`: all backend database scenarios; requires the isolated `vinexusAccessTest` replica set on port 27019.
- `npm run test:e2e -- --workers=2`: development browser suite on port 4173.
- `npm run test:e2e:production`: builds the frontend and runs browsers against its preview on port 4174.
- `npm run test:release`: unit/API, database integration, development browser, production build/browser, and frontend lint checks in sequence. Start the isolated test replica set first. This command does not deploy.

Production and development browser runs use separate artifact directories under `test-results` and `playwright-report`.
