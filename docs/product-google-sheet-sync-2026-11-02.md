# Product management through Google Sheets

The Products admin section offers **Product Catalogue** and **Google Sheet**. The same MongoDB catalogue powers both workflows and the storefront.

## One-time connection

1. Enable Google Sheets API for your Google Cloud project and configure a service account on the backend using `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Keep the key on the server; the admin interface never accepts or returns private keys. This product workflow uses the real Google API, independently of the enquiry development provider.
2. Create or choose a spreadsheet in the owner's Google account and share it with the service-account email as an **Editor**. A public sheet is unnecessary.
3. Open **Admin → Products → Google Sheet**, paste its Google Sheets URL, then choose **Create Product Sheet**. `GOOGLE_PRODUCTS_SPREADSHEET_ID` can supply a default; otherwise the existing enquiry spreadsheet ID is a fallback.
4. Initialization creates dedicated `ViNexus Products`, `ViNexus Product Reference`, and `ViNexus Product Guide` tabs in that workbook. Existing tabs are preserved; a numeric suffix avoids name collisions. All current products, including inactive drafts, are exported. The same tab IDs and workbook are reused thereafter.

No new Google Drive file is created by the backend: the owner supplies a workbook so ownership and editing access remain with their Google account. No live workbook was initialized during implementation because Google credentials are absent in the local environment.

## Editing and syncing

- Edit existing rows or add a row with a unique SKU and blank Product ID. New rows default to Draft unless Status is Published. Published products must satisfy normal product validation.
- Use **Sync Products** after editing. Sync is explicitly triggered; it does not poll Google or apply edits while the user is typing.
- The sheet includes identity/model, brand/category memberships, description, standard/dealer prices, stock, publication status, Trending/New Arrival/Low Stock, variant, HSN, warranty, product URL, information phone, image URLs, specifications, additional details, updated time, and row sync results.
- Image URLs are one HTTP/HTTPS link per line. Existing stored metadata/public IDs are retained for matching image URLs. New URLs are linked images, not files uploaded to application storage. Local image files still use the product editor.
- Brand/category names or IDs must refer to managed entries; the reference tab lists them. Add new brands/categories in their admin sections, then sync again. Reference entries refresh after sync.
- Specifications and additional details use JSON arrays of `{"key":"Resolution","value":"3MP"}` entries. Leading zeros in model numbers, SKUs and HSN are preserved. App exports use Google `RAW` values, so product text is not interpreted as a spreadsheet formula.
- Blank text/relationship/list cells clear that field. Numeric cells use explicit zero; blank prices or stock on existing rows are errors. Use `[]` to clear specifications or additional details.
- Deleting a spreadsheet row does **not** delete a catalogue product. Missing products are appended again. Use Draft to hide a product; permanent deletion remains in the catalogue UI.
- Catalogue-only changes are copied back to the sheet; edits to different fields merge. If both places edited the same field differently, that row is skipped and its conflict is reported. Set conflicted cells to the current catalogue values, sync, then make the desired edit and sync again.
- Errors are displayed in the admin result table and the sheet's last column. Successful rows remain applied when other rows fail. At most 500 row errors are retained in the admin summary; the sheet contains every row result.
- Finish editing before starting a sync; wait for it to finish before further Google edits. Google Sheets and MongoDB do not share a transaction. If a Google write fails after catalogue writes, successful catalogue changes remain. Retry Sync Products: stable IDs/SKUs and per-product baselines make normal retries idempotent.
- Keep IDs and column headers unchanged. Full-row sorting is supported. Duplicate IDs/SKUs or altered headers block the operation before product writes.

## Implementation and operations

- Routes: `GET /api/admin/products/google-sheet`, `POST /api/admin/products/google-sheet/initialize`, `POST /api/admin/products/google-sheet/sync`. They inherit Products read/write authorization and are registered before `/:id`.
- `ProductSheetConnection` stores the single managed workbook/tab connection and the latest result. `ProductSheetRecord` stores each exported product's field baseline, with a unique product ID index.
- A database lease serializes sheet operations across server processes. Product writes retain existing validation, derived catalogue fields, price history, image cleanup and admin auditing. Sync also compares `updatedAt` in product writes to reject intervening catalogue edits.
- Google requests and baseline writes are batched. The initial export is not restricted to the normal admin list page size. There is no eight-product or 200-product sheet cap; normal Google Sheets capacity and API quotas still apply.
- Existing spreadsheet access is managed through Google sharing, independently of application employee roles. Only share the workbook with intended editors.
- Creation and syncing fail visibly if credentials or Google access are missing. The interface never reports a development-provider simulation as a real product sync.

Tests cover field round trips, draft defaults, input validation, row conflicts, retry idempotency, lock contention, catalogue changes, request authorization, and the browser connection/sync/error flows. Live Google access still needs verification after deployment and credential setup.

Google API references: [read/write values](https://developers.google.com/workspace/sheets/api/guides/values), [batch updates](https://developers.google.com/workspace/sheets/api/guides/batch).
