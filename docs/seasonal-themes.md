# Seasonal themes

Open **Admin → CMS → Seasonal Themes** (`/admin/cms/themes`). Create a campaign, choose a preset, customize colors/announcement/decorations, and inspect the live desktop/tablet/mobile preview. The preview is read-only and never changes the live store. **Apply to store** saves, publishes and activates the current design in one action, including a new unsaved campaign.

1. **Save draft** persists private changes. Upload buttons are available immediately; uploading automatically creates/saves a private campaign draft with the image.
2. **Publish draft** snapshots both the design and its schedule. Further draft edits do not affect that snapshot.
3. **Activate now** pins a published theme immediately, overriding schedules until **Resume schedules** or **Restore default** is clicked.
4. Alternatively, enable a schedule, enter start/end in **India time (Asia/Kolkata)**, save and publish. With schedules resumed, the server resolves the active theme on every public request. Start is inclusive; end is exclusive. Priority wins overlaps, then publication time, then campaign ID.
5. **Restore default** immediately restores the existing burgundy store/black footer and pauses scheduled activation. **Resume schedules** clears that override. Archiving removes a campaign from eligibility. After the last scheduled campaign expires, the default returns.

Built-in presets: Store default, Diwali, Holi, Eid, Christmas, Independence Day, Republic Day, Raksha Bandhan. They are editable starting points, not annual calendar rules. Create dates for each year's festival explicitly.

Every festival preset includes bundled header, page-background and footer artwork, coordinated readable colors, rounded product cards and a festival greeting. Diwali uses the generated cream-and-gold PNG set; other festivals use lightweight vector artwork: Holi color splashes, Eid crescents/lanterns, Christmas trees/snowflakes, Independence Day kites/tricolor details, Republic Day wheel motifs, and Raksha Bandhan rakhi/floral details. Decorative backgrounds are kept subtle and never cover product images or alter existing hero banners. These assets ship with the frontend under `public/theme-assets/`; deploy that folder with the frontend build.

Selecting a different preset replaces bundled festival artwork and the preset greeting, while preserving custom image uploads, custom announcement text and selected hero banners. **Restore preset artwork** restores all three original images for the selected festival in the private draft (including replacing custom overrides). Saved and published campaigns are not automatically migrated or changed; reselect a festival to get its new styling, or restore its artwork, preview and Apply when ready. Store default still has the original black footer with no festive artwork.

**Advanced styling** adds original/minimal/elegant/playful quick looks, system/serif/rounded fonts, page heading accents, button shapes, product-card corners/shadows/borders, homepage spacing, generated background patterns and spacing, uploaded background sizing/fit, navigation gradients, announcement finishes, footer tint, and decoration placement/size/density/strip heights. Garland, flower, snowflake and lantern decorations are also available. Existing campaigns without these settings retain the original defaults. Options are validated choices and bounded numbers, never arbitrary CSS or scripts. Save/Apply persists these settings in the same draft/published workflow.

Uploads accept PNG/JPG/WebP up to 5 MB through the existing authenticated CMS upload pipeline. Header/footer images are decorative strips; background images repeat at 600 px. Upload transparent decorations as PNG/WebP. Existing hero banners can be assigned to a campaign; unavailable/inactive selections fall back to regular banners.

When the storage provider is `development`, theme images are decoded and stored as real WebP files in `backend/var/theme-assets/`, served through `/api/content/theme-assets/`. Keep this folder on persistent storage if using it on a server. Cloudinary configurations continue to use Cloudinary. Previously generated `mock.storage.vinexus.dev` URLs cannot be recovered; upload those images again.

Ten prior published designs are retained and can be restored into a draft, then saved and republished. Images are intentionally retained to avoid breaking live/history snapshots; orphan-asset garbage collection is not included. Saves/publishes use optimistic revisions and return HTTP 409 for stale editors.

Themes affect storefront colors and decorations, not the admin panel, product content, banking information, prices, or stock. Semantic status colors remain unchanged. Low-contrast color combinations produce editor warnings. Animation respects reduced motion.

## Deployment

Deploy both backend and frontend, including the root `shared/` directory alongside `backend/` (the server imports the shared preset/resolver module). No new environment variables or migration are required. MongoDB creates the `SeasonalTheme` collection when the first campaign is saved, and website settings gain an optional `activeThemeId`. Existing installations keep their default theme until a campaign is published and eligible.

The public `/api/content/theme` and theme-aware hero endpoint use `no-store`; open storefronts refresh once per minute, on focus/visibility, and at the next schedule boundary. A failed theme request falls back to bundled defaults. No cron service is required.

## Verification

`npm run test:unit` covers presets, safety validation, boundaries and precedence. `npm run test:api -- --runTestsByPath tests/api/seasonalThemes.api.test.js` tests the CMS lifecycle with mocked persistence (never production MongoDB). `npm run test:e2e -- tests/e2e/seasonalThemes.spec.js --workers=1` verifies isolated previews, publish/activate, responsive widths and fallback in Chromium with mocked APIs.
