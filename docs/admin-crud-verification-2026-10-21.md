# Admin CRUD verification — 21 October 2026

## Production data and cleanup

Production was not used for create/update/delete tests. Every backend test connection was redirected to the local MongoDB replica set on port 27019, with a disposable database name enforced by the test guard. This includes the old tests that ordinarily read the application's database configuration. Email, SMS, push, storage and Google Sheets providers were forced to development/simulation settings. No real campaigns, notifications, invoices, account changes or storefront settings were written to production.

The runner now verifies that each manifested test database has disappeared after dropping it. Local image assets go into a per-test temporary directory and are removed too, including when assertions fail. In-memory development storage disappears with its test process. Logs and browser reports remain locally for review; they contain synthetic fixture data.

These checks exercise the current local code, not the currently deployed backend, its credentials, or live Cloudinary connectivity.

## Issues found and fixed

- Header, main and subcategory editors uploaded images through the Shared media uploads section. Category-only employees therefore failed when adding an image. A category-scoped upload endpoint now applies Categories write permission.
- New promotional banners had the same problem. Promo-scoped upload and unused-image cleanup endpoints now work with Promotional banners write permission. Cleanup refuses other folders and images referenced by a saved promo.
- Many admin pages passed a single message to a toast container that only supported an array. Their save/delete success notices and error notices silently disappeared. The toast container now supports both established call patterns and dismissal.
- Removing a brand logo cleared the database field but retained its stored image. Updates now delete the previous stored logo when it is explicitly removed or replaced, while unrelated brand edits preserve it.
- The API test inventory did not traverse nested routers, omitting theme and homepage banner-grid routes. Recursive discovery now includes those routes. The permission matrix checks all 93 mounted admin mutation endpoints, including real customer and dealer inquiry records.

## Section coverage

Only operations actually offered by the application are listed. Read-only dashboards/reports do not need fabricated create/delete actions; financial records and audit logs retain their intended history.

| Admin section | Operations exercised | Primary evidence |
| --- | --- | --- |
| Dashboard | Read statistics and authorization | adminDashboard, adminCms |
| Header/main/subcategories | Create, list/detail, edit, delete; parent/cycle checks; protect assigned products; SVG image upload with category-only access | adminCategory, adminCrud; adminCrud browser |
| Products/inventory | Create/detail/list/edit, deactivate, permanent delete, stock changes, images, price/spec/order handling | adminProduct, productImageEditing, storefrontControls; gallery/catalog browser tests |
| Product import/positioning | Preview/commit imports, duplicate handling, header positioning/order persistence | productImport, catalogIntegration; productPositioning browser |
| Specification templates | Create/search/read/update/delete, copy independent specs, stale-edit and permission checks | specTemplates; specificationTemplates browser |
| Brands | Create/list/edit/delete/deactivate linked records; upload/replace/remove logos | brandLogo, adminCrud; brandLogo browser |
| POS | Customer save/verification, bill creation/read, held bills, invoice/export, return/refund/void, stock accounting and idempotency | posIntegration, posBilling API/unit; POS browser suites |
| Dealers | List/detail, approve/reject/revoke KYC, pricing/authorization consequences | adminDealer; route and permission browser coverage |
| Customers | List/detail, block/unblock, validation and access consequences | adminCustomer; route browser coverage |
| B2C/B2B inquiries | List/detail, status/notes/replies, stock effects, permission separation; simulated provider actions | adminEnquiry, enquiry/inquiryFlow, googleSheets, whatsApp; inquiry browser |
| Sessions | List/detail, revoke/delete permitted records, protect current session and pin it first | adminSession, storefrontControls; session browser |
| Access roles/employees | Role create/read/update/delete, assignment guard, employee create/update/block, permission changes and session invalidation | adminAccess; adminAccess browser |
| Audit logbook | Read/search/detail and redaction; writes logged and journal failure rolls back changes | adminAccess, campaigns; logbook browser |
| Campaigns | Draft create/read/update/delete, duplicate, preview/review, simulated queue/delivery/cancel, permission/opt-out checks | campaigns; campaigns browser |
| Homepage banners/grid | Legacy banner CRUD; grid image add/read/edit/replace/remove, transitions, capacity and stale-edit checks | adminCms, adminCrud; bannerGrid/bannerSwipe browser |
| Promotional banners | Create/read/edit/delete, scoped image upload, failed-create cleanup and referenced-image protection | adminCms, adminCrud; adminCrud browser |
| Static pages | Create/read/edit/delete, publishing, slug validation and unsafe-content rejection | adminCms; full CRUD browser scenario |
| Trust badges | Create/list/detail/edit/delete through the existing API | adminCms, adminCrud; no mounted trust-badge page exists in AppRoutes |
| Footer | Read/update, link/bank/social configuration and scoped SVG QR upload | adminCms, productImageEditing; footer browser |
| Website/SEO settings | Read/update, asset validation and sharing metadata behavior | adminCms, storefrontControls; website/metadata browser |
| Seasonal themes | Create/list/detail/edit, upload, duplicate, publish/activate/archive/reset; published/draft isolation and stale-edit checks | adminCrud, seasonalThemes API; seasonalThemes browser |
| Shared media | Upload/read metadata/delete/replace, type/size/path checks and permission boundaries | storage, adminCrud; section-scoped upload browser scenarios |
| Own admin profile | Read/update name/email/phone, reject incorrect current password, change password, keep admin role and hide hash | adminCrud; route browser coverage |

The database test filenames above omit `.test.js`; browser scenarios are in `tests/e2e`.

## Final results

- Unit: 438 passed across 42 suites.
- API: 253 passed across five suites, including the expanded recursive route inventory.
- Real HTTP/database integration: all 35 test files passed; database and temporary-asset cleanup verified for every file.
- Full development browser suite: all 208 tests passed.
- Compiled production browser suite: 203 passed; five Firebase source-injection scenarios skipped here and passed in development.
- Frontend lint: passed with existing warnings. Patch whitespace checks passed.

Five Firebase browser scenarios inject development source modules and are intentionally excluded from the compiled-build pass; they are covered by the development browser suite. External production-provider delivery and deployed configuration are not verified by these local tests. Nothing was pushed or deployed.
