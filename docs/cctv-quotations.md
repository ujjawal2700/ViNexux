# Quick CCTV quotations

Storefront entry: **Quick CCTV Quote** → `/cctv-quote`. Saved customer quotations: `/account/quotations`. Admin: **Sales & Enquiries → CCTV Quotations**. Super admins can open **Quotation Settings** from that section.

## Before using it with customers

1. Review seller name, GSTIN, address, state, email, phone, terms, validity and service areas in Quotation Settings. Initial service areas are Kota City, Kota Surrounding Areas and Outside Kota.
2. Review the product compatibility mappings. Existing active products/variants in public categories are initially inferred from their names, models and specifications. Explicit mappings override inference. Set camera technology/style, recorder and power capacity, PoE ports, and disk/card capacity in GB (1TB = 1000GB). Mark preferred recommendations and exclude unrelated products.
3. Check a representative HD, IP, WiFi and 4G configuration against the business's actual compatibility requirements. The matcher uses classified technology/style/capacity; it does not independently certify codec, sensor resolution, recording bandwidth or PoE wattage compatibility. The team confirms those under the quotation terms.
4. Set installation per camera to 0 for hardware-only estimates. A positive value creates an itemized installation service line; cabling, travel and other services are not silently added. Admins may revise the final package after discussion/site survey.
5. Configure the existing SMTP provider for real verification-code and PDF emails. Development email delivery is identified as simulated rather than reported as real delivery. PDF downloads remain available if email delivery fails.

No schema migration or new package installation is needed beyond the application's existing dependencies. MongoDB creates the new quotation, settings and email-verification collections and indexes. Build the frontend and restart the backend when deploying.

## Customer flow

Six steps: system type → camera counts and models → storage/accessories → service area → property type → contact/project details. Compatible products can be searched by name, model, SKU or brand. Automatic camera recommendations search all brands unless a customer explicitly selects a brand. Camera choices require the matching dome/bullet style. UPS units, memory cards, recorders and other identified accessories cannot become camera choices through category placement or a mistaken camera mapping. Missing camera options use the team-recommendation fallback; unknown standalone camera styles are not substituted for both styles. Numeric fields use text entry with a numeric/decimal keyboard and range validation, without spinner arrows or a forced leading zero. A floating pill at the bottom right of the storefront opens the wizard; a suggestion appears on every page refresh and remains until dismissed, and its hover shimmer respects reduced-motion preferences. Recorder capacity is matched automatically for HD/IP; standalone WiFi/4G cameras use one memory card per camera. Optional accessories can be included/excluded and quantities adjusted.

Guests can configure but do not receive product prices from the API. Signing in is required to see applicable prices and save a quotation. Configuration (not personal contact fields) is temporarily retained in session storage to continue after login. Verified account email may be reused; another or unverified address needs a six-digit email code, with resend cooldown, expiry, attempt limit and a short-lived user/email-bound verification token. GSTIN is format-checked only; the UI explicitly leaves registration confirmation to the team.

The server recalculates using the current catalogue and existing retail/dealer/Installer pricing rules. Customer-supplied totals or extra fields are rejected. Camera/accessory selections are submitted by product/variant IDs. Missing compatible items, missing prices or insufficient stock create a manual-confirmation request with no fabricated grand total. This process does not reserve stock, add to cart, place an order or produce a tax invoice.

Priced quotes itemize tax and rounding. Seller and selected customer state determine intra-state split vs IGST in the configured calculation. Product prices are before GST; final totals round to the nearest rupee. Applicable tax setup must be confirmed by the business in Quotation Settings.

The result is saved and a branded PDF is generated/emailed. Each customer can view only their own list, detail, PDF and email action. Copied links require the owner to sign in; PDFs are not exposed through public unguessable-link routes. Customers can send follow-up messages. Staff responses can notify them through the existing push system; the detail page refreshes on focus/push and periodically when the customer is not typing.

## Admin operations

A new **quotations** permission section controls employee read/write access; super admins retain full access. Only super admins configure catalogue mappings and global quotation settings. Admins can filter/search requests, download/email their saved PDFs, update workflow status and send customer-visible responses. Confirmed custom line items can be issued for manual requests or revised packages. Previous pricing snapshots are retained, edits use a version check, and revisions require a customer-facing explanation. Existing quotation settings and seller snapshots remain stable when global settings change.

New requests enter the existing super-admin arrival stream, which supplies the ring/banner and push alerts. Email errors do not undo saved requests. Creation uses a user-scoped request ID for idempotent retries.

Statuses: `new`, `processing`, `responded`, `closed`. Quotation expiry is shown to the customer; expired quotes can still be downloaded for reference and require reconfirmation before ordering.

## Verification

Pricing tests cover the reference WiFi calculation, HD/IP equipment, stock/manual fallbacks, optional accessories, GST/rounding, forged IDs/totals and guest price hiding. API tests cover role pricing, owner access, email verification, snapshots/idempotency, SMTP failure and admin revisions. Production browser tests cover all six steps, email verification, PDF download, account navigation, responsive widths down to 320px, accessory changes and admin settings/follow-up. PDF fixtures include single- and multiple-page quotes for visual review.
