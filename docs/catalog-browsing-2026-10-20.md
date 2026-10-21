# Catalog browsing and admin improvements — 20 October 2026

## Changes

- The admin product Specifications tab has a display-order list with native vertical dragging, move-up/down buttons and Alt+Arrow keyboard controls. Saving preserves the order, including the managed brand row; changing a category specification value keeps its existing position. The storefront renders technical specifications in that saved order. Existing non-inventory specifications are retained during edits.
- Product details show recently viewed products, most recent first. History is bounded to ten unique product IDs, with repeat visits moved to the front. The currently open product is excluded from the recommendation cards. Cards resolve current product data through the API, avoiding stale prices and hiding unavailable products. Persistent history follows the existing optional-preferences setting; otherwise history stays in memory for the current app session. Disabling preferences clears the optional stored histories.
- Related products resolve the common root/header category, including sibling main/subcategories, instead of requiring an exact leaf category. The current product is excluded. A Show more button exposes every results page, and the category link opens the complete header catalog. Related requests support cancellation and retry.
- Desktop and mobile storefront search submit with Enter and reset old pagination. Opening search displays up to six recent distinct queries; clicking or keyboard-activating a query searches immediately. Query history has the same storage-consent handling as recently viewed history. Closing the dropdown or submitting is no longer undone when an older autocomplete response arrives. Existing admin product search also handles Enter through FilterBar.
- Only the admin sidebar receives darker navigation/group/search text and stronger link weights, with dark-mode contrast retained.
- Footer QR and social image uploads use `/api/admin/cms/footer-content/images/:kind`, governed by footer-content permissions. The server restricts kind/folder selection. A footer editor no longer needs unrelated shared-media upload rights. SVG is accepted, rasterized before storage and never stored as active SVG. Bank QR images use lossless WebP to preserve scan detail. The footer picker accepts SVG and supported raster images up to 5 MB, including MIME fallback for supported file extensions.

## Local versus live QR uploads

A reproducible permission mismatch exists in the previous implementation: the footer editor called the shared upload endpoint, which requires the separate uploads permission. Restricted employees with footer read/write permission could therefore edit the footer but receive 403 when uploading QR artwork. The corrected route is tested with a real footer-only employee and an isolated database. Users without footer write permission remain blocked.

The previous SVG conversion fixes and these footer-route changes are local workspace changes. Applying them to the live site requires deploying both the updated frontend and backend. Production server logs/configuration were not available in this workflow, so this does not establish the exact cause of every live upload failure or claim a production deployment. The checked-in nginx example already allows 100 MB request bodies; actual live proxy limits and Cloudinary configuration may differ.

## Verification

- 385 unit tests passed, including history limits/deduplication/corrupt storage handling, category ancestry, specification ordering and lossless QR pixel comparison.
- 232 API tests passed.
- 11 browser tests passed: vertical spec dragging, arrow movement, save/reload/storefront order; sibling-category related products and pagination; recent-view ordering/persistence; desktop and mobile Enter search and history reuse; restricted-employee footer SVG upload; existing product-image editing; storefront footer rendering.
- Three real database integration files passed: adminCms, adminProduct, productImageEditing. The last exercises stored specification order and footer-only/denied upload permissions. They use disposable local test databases and development storage/messaging providers.
- Frontend production build passed; lint completed with existing warnings and no errors. git diff --check passed.

Prior image cleanup/security changes remain in the workspace. No business products were modified by these tests.
