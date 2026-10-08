# Homepage bento banners

Open **Admin → Homepage Banners** (`/admin/cms/banners`). The **Homepage bento grid** editor contains four fixed sections, with up to three images in each section (12 images total). Select multiple PNG/JPG/WebP files at once, each up to 5 MB, adjust each image in the preview dialog, then confirm Upload. Nothing is uploaded until confirmed. Confirmed uploads save directly to the homepage; there is no separate publish step for this CMS feature.

**Preview / crop & adjust** opens the same editor for existing banners without requiring a new upload. Choose fill/crop or fit-entire-artwork mode, zoom (1×–3×), and horizontal/vertical position (0–100%). Drag the highlighted tile or use the keyboard-accessible sliders. Desktop/tablet/mobile previews show all four tiles together, and **View original image** shows the unframed source. Cropping is non-destructive: original pixels remain stored, while bounded framing metadata controls the visible region. Preview and storefront use the same rendering helper. The crop applies across devices; responsive tile proportions can show a different amount of the image, so check each device. Reset crop restores centered 1× framing in the draft dialog; Cancel discards dialog changes. Save crop & adjustments updates the live banner. The expandable **Preview homepage grid** also shows the saved four-section layout.

Desktop layout: a large left tile, two stacked middle tiles, and a tall right tile. Below 1024 px, the layout becomes a balanced 2 × 2 grid. Corners are subtly rounded (10 px desktop, 8 px mobile). The old single full-width hero carousel is no longer rendered.

Use landscape artwork for section 1, wide artwork for sections 2–3, and portrait artwork for section 4. Exact cropping varies with the viewport. Each image can be set to **Show entire image** instead of **Fill tile**. Optional captions and destination links are independently editable. Replacement works even when a section already has three images. Remove only removes the placement; original stored uploads are retained.

Each section rotates independently when it has multiple images (5–7.1 second intervals). Previous/next and pause/play controls are available. Autoplay pauses on hover, keyboard focus and when the document is hidden; reduced-motion preferences disable autoplay and fades. Static one-image sections do not show carousel controls.

Before the first dedicated-grid upload, all four sections show collection links. Only images uploaded into the corresponding section appear there. Seasonal-theme previews use the same bento grid. The old banner library, its full-width fallback, and per-campaign legacy banner selection have been removed from the admin workflow and storefront; previously stored `Banner` documents and their image files are retained but no longer rendered by the site.

## Backend and deployment

The `BannerGrid` singleton stores exactly four sections with embedded image metadata. Authenticated admin endpoints live under `/api/admin/cms/banner-grid`; the public read endpoint is `/api/content/banner-grid` with `Cache-Control: no-store`. Writes use an optimistic revision and atomic capacity checks, so stale tabs and simultaneous uploads cannot exceed three images in a section. Refresh the grid after a conflict.

Cloudinary uses the existing CMS storage pipeline. Development storage writes real decoded WebP files to `backend/var/theme-assets/`, served by the existing public theme-asset endpoint; keep this directory on persistent storage for deployed development-provider installations. Replaced/removed uploads are retained; orphan-file cleanup is not included. No migration of existing banners is required. Deploy both frontend and backend; no live production data is modified by the source changes.

Tests: `tests/unit/bannerGrid.test.js`, `tests/api/bannerGrid.api.test.js`, and `tests/e2e/bannerGrid.spec.js`. Existing seasonal-theme tests also cover preview/activation and footer behavior with the new hero layout.
