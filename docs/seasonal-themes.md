# Seasonal themes

Open **Admin → CMS → Seasonal Themes** (`/admin/cms/themes`). The editor has three main sections:

1. **Choose your theme**: select a festival and give the theme a name. Matching colors and pictures are included.
2. **Add your message and pictures**: edit the announcement and optionally replace the top, background or bottom picture.
3. **Preview your website**: switch between desktop, tablet and mobile. Each view renders the real device width and scales to fit the panel; the preview is read-only.

**Save draft** keeps changes private. **Apply to store** saves and applies the design in one action after a styled in-app confirmation popup. Browser confirmation boxes are not used. Uploading a picture saves a private draft automatically. Edits never appear on the live store until applied or published through scheduling.

**More design options** is collapsed by default and loads the detailed style controls only when opened. **Schedule for later** contains optional India-time dates and priority. **Save schedule** publishes the design and dates; if the theme is already live, its changes become public. **Resume schedules** clears a manual override. Highest priority wins overlapping dates, followed by publication time and campaign ID. Start is inclusive and end is exclusive.

**Saved themes and store settings** contains existing themes, duplicate/archive, earlier designs, activation and **Restore default**. Restoring the default brings back the burgundy store and black footer and pauses automatic activation.

The editor normalizes incomplete legacy records, invalid dates, colors, image slots and style settings. Load failures show a retry action; failed saves retain edits on the page. Unsaved theme edits are recovered from tab-local session storage after a refresh, scoped to the signed-in admin. Preview updates are debounced while typing, and only one save/upload/apply operation runs at a time.

Built-in presets: Store default, Diwali, Holi, Eid, Christmas, Independence Day, Republic Day, Raksha Bandhan. They are editable starting points, not annual calendar rules. Create dates for each year's festival explicitly.

Every festival preset includes bundled header, page-background and footer artwork, coordinated readable colors, rounded product cards and a festival greeting. Diwali uses the generated cream-and-gold PNG set; other festivals use lightweight vector artwork: Holi color splashes, Eid crescents/lanterns, Christmas trees/snowflakes, Independence Day kites/tricolor details, Republic Day wheel motifs, and Raksha Bandhan rakhi/floral details. Decorative backgrounds are kept subtle and never cover product images or alter existing hero banners. These assets ship with the frontend under `public/theme-assets/`; deploy that folder with the frontend build.

Selecting a different preset replaces bundled festival artwork and the preset greeting, while preserving custom image uploads, custom announcement text and selected hero banners. **Restore preset artwork** restores all three original images for the selected festival in the private draft (including replacing custom overrides). Saved and published campaigns are not automatically migrated or changed; reselect a festival to get its new styling, or restore its artwork, preview and Apply when ready. Store default still has the original black footer with no festive artwork.

**Advanced styling** adds original/minimal/elegant/playful quick looks, system/serif/rounded fonts, page heading accents, button shapes, product-card corners/shadows/borders, homepage spacing, generated background patterns and spacing, uploaded background sizing/fit, navigation gradients, announcement finishes, footer tint, and decoration placement/size/density/strip heights. Garland, flower, snowflake and lantern decorations are also available. Existing campaigns without these settings retain the original defaults. Options are validated choices and bounded numbers, never arbitrary CSS or scripts. Save/Apply persists these settings in the same draft/published workflow.

Uploads accept PNG/JPG/WebP up to 5 MB through the existing authenticated CMS upload pipeline. Header/footer pictures fill the full website width without stretching. The Diwali preset trims empty cream margins and repeats the artwork at a fixed compact height: 48px header / 64px footer on desktop and 32px / 40px on mobile. The garland and flames keep their proportions and remain vertically intact. Custom pictures also repeat across the compact band, preserving their proportions and showing the complete image; background images repeat at 600 px. Upload transparent decorations as PNG/WebP. Homepage banners are managed separately under Homepage Banners.

When the storage provider is `development`, theme images are decoded and stored as real WebP files in `backend/var/theme-assets/`, served through `/api/content/theme-assets/`. Keep this folder on persistent storage if using it on a server. Cloudinary configurations continue to use Cloudinary. Previously generated `mock.storage.vinexus.dev` URLs cannot be recovered; upload those images again.

Ten prior published designs are retained and can be restored into a draft, then saved and republished. Images are intentionally retained to avoid breaking live/history snapshots; orphan-asset garbage collection is not included. Saves/publishes use optimistic revisions and return HTTP 409 for stale editors.

Themes affect storefront colors and decorations, not the admin panel, product content, banking information, prices, or stock. Semantic status colors remain unchanged. Low-contrast color combinations produce editor warnings. Animation respects reduced motion.

## Deployment

Deploy both backend and frontend, including the root `shared/` directory alongside `backend/` (the server imports the shared preset/resolver module). No new environment variables or migration are required. MongoDB creates the `SeasonalTheme` collection when the first campaign is saved, and website settings gain an optional `activeThemeId`. Existing installations keep their default theme until a campaign is published and eligible.

The public `/api/content/theme` and theme-aware hero endpoint use `no-store`; open storefronts refresh once per minute, on focus/visibility, and at the next schedule boundary. A failed theme request falls back to bundled defaults. No cron service is required.

## Verification

`npm run test:unit` covers presets, safety validation, boundaries and precedence. `npm run test:api -- --runTestsByPath tests/api/seasonalThemes.api.test.js` tests the CMS lifecycle with mocked persistence (never production MongoDB). `npm run test:e2e -- tests/e2e/seasonalThemes.spec.js --workers=1` verifies isolated previews, publish/activate, responsive widths and fallback in Chromium with mocked APIs.
