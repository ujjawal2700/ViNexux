# FixDaddy CCTV quotation feature — research and replication requirements

Review date: 19 November 2026 (Asia/Kolkata). Research only; no storefront or backend implementation changes.

Reference: [FixDaddy CCTV Quote Calculator](https://www.fixdaddy.in/cctv-quote), which resolves to `https://fixdaddy.in/cctv-quote`.

## Evidence and limits

- **E1 — observed browser UI:** camera selection, counts, brand/model search, recommendations, mobile-viewing choice, navigation controls, and a live itemized quotation. A WiFi configuration with two dome and two bullet cameras displayed a total of ₹17,134 including GST.
- **E2 — publicly delivered wizard code:** all six steps, input state, product matching, validation, accessory controls, request payload, and success-screen branches. [Wizard bundle](https://fixdaddy.in/_next/static/chunks/309pfubh-__2h.js).
- **E3 — public form and invoice code:** customer fields, GST lookup UI, email-code verification UI, system types, and tax/rounding calculation. [Form/invoice bundle](https://fixdaddy.in/_next/static/chunks/2dg8svu1gue79.js).
- **E4 — public pricing/recommendation code and catalogue:** recommended storage/power/rack/memory items and line-item calculation. [Pricing bundle](https://fixdaddy.in/_next/static/chunks/2-zogmhxllef_.js).
- **E5 — public form options:** contact preferences, requirement types, site types, and property-to-site mapping. [Shared-options bundle](https://fixdaddy.in/_next/static/chunks/1fcm60owj-siw.js).
- **E6 — server-rendered public page data:** area/property choices, disclaimer, catalogue categories and product attributes embedded in the page response.

E1 is direct UI observation. E2–E6 are static inspection of the actual publicly delivered page and code; they establish client behavior, not private backend behavior. The native browser exposed its current page but did not reliably accept navigation/input actions, so the later wizard steps were inspected in the public source rather than exercised interactively. No email code was requested, no personal details were entered, and no quotation/lead was submitted. The generated PDF's actual layout, email delivery and admin workflow remain unverified. Evidence labels here are labels for this audit, not REA engine evidence records.

Downloaded evidence, readable code, extracted wizard props and SHA-256 manifest are retained locally under `/tmp/fixdaddy-quote-research/`. These are temporary research files; the external site's source and product catalogue are not copied into the ViNexus application.

## 1. User journey

The feature is a six-step configurator, not a single contact form. Previous/Next controls retain choices while the component remains mounted. Numbered progress markers show the current step and completed steps. Browser-refresh persistence was not established.

| Step | Main controls | Defaults and progression |
| --- | --- | --- |
| 1. Camera Type | HD Camera, IP Camera, 4G Camera, WiFi Camera | Generic entry defaults to HD. Selecting a different system clears accessory overrides. |
| 2. Cameras | Dome count, bullet count, brand, dome/bullet models, model search, mobile viewing Yes/No | Counts start blank on generic entry. At least one camera and an explicit mobile-viewing choice are needed to continue. |
| 3. Storage | Storage and accessory tabs with suggested products, optional inclusions and quantities | Recommendations are selected automatically. A storage item is required when the catalogue can price the setup. |
| 4. Area | Jaipur City, Jaipur Rural, Outside Jaipur | First area is preselected. |
| 5. Install Type | Residential, Small Business, Corporate, Community & NGO | First property type is preselected. |
| 6. Your Details | GST/business details, contact details, requirement, project details, contact preference | Email verification is required before submission. Final action requests the quotation. |

Desktop uses a main form column and a roughly 320px sidebar; the quote card becomes sticky. On smaller screens the layout stacks, and step labels are hidden while numbered markers remain. Selected options have red accents; recommended selections use a green confirmation treatment. The right column also explains the service and benefits. [E1, E2, E6]

## 2. System-specific behavior

| System | Cameras | Recorder | Main storage | Other suggested items |
| --- | --- | --- | --- | --- |
| HD | Wired HD/analog catalogue | DVR/XVR, automatically selected | One HDD | Power supply and rack included by default; optional memory-card backup |
| IP | Network-camera catalogue | NVR, automatically selected | One HDD | PoE switch and rack included by default; power supply and memory-card backup optional |
| 4G | Standalone products matching 4G | None | One microSD per camera | Power supply and rack optional, initially excluded |
| WiFi | Standalone products matching WiFi | None | One microSD per camera | Power supply and rack optional, initially excluded |

Dome and bullet counts are separate number inputs with displayed minimum 0 and maximum 50 each. One model is selected for all dome cameras and one for all bullet cameras; this is not an arbitrary list of individually different cameras. The total count is shown immediately. For standalone cameras, the same product can fill both groups; identical selected camera products are merged into one line in the quote. [E1, E2]

The generic page has no preset. The wizard also supports a product-specific preset containing product slug, system, brand, counts and selected model IDs; a preset starts at the camera step. The separate product-page entry journey was not exercised. [E2, E6]

## 3. Camera and brand selection

- Brands are derived from the selected system's catalogue. Brand keys normalize capitalization, punctuation and spacing, so variants of CP Plus/Hikvision naming group together.
- Default brand ordering favors the brand with the most models, then alphabetical name.
- Changing brand clears previous dome/bullet product selections so the new brand gets suitable defaults.
- An all-brand camera search matches normalized words against brand, product name, product ID and style. Resolution/model identifiers embedded in names/IDs can be found. All entered words must match; results are priced and limited to eight.
- Selecting a search result chooses its brand and matching dome/bullet model. If that group currently has zero cameras, it becomes one. A brand change clears incompatible selections in the other group.
- Brand and individual model searches accompany native dropdowns. Search has clear controls and no-result messages. Product searches show prices and recommended badges.
- Model lists prioritize matching dome/bullet style and lower price. Fallback behavior can offer other styles when matching models are missing, especially for standalone systems.
- Recommendation scoring uses resolution (up to 8MP), additional weight for color/night-color features, audio, and hybrid/smart/dual-light features. It prefers products within 1.6 times the cheapest candidate. In-stock candidates are preferred, but fallbacks can still select low/out-of-stock products. [E1, E2]

These are deterministic rules, not evidence of an AI-generated design service.

## 4. Recorder and accessory matching

**Recorder:** require channels greater than or equal to total cameras. Prefer the selected camera brand if it has a qualifying recorder; otherwise consider other brands. Within that set choose the smallest sufficient channel count, then lowest price. If no recorder can accommodate the count, the page switches to a team-priced request rather than inventing a numeric price. [E2]

**Displayed channel selector:** shows 4/8/16/32 with the inferred size highlighted and other sizes disabled. It is informational, not a free recorder-size choice. Actual recorder matching uses the product's capacity, which can differ from those displayed tiers. [E2]

**HDD recommendation:** 1TB for up to 4 cameras, 2TB for 5–8 cameras, 4TB above 8 cameras. Prefer matching Seagate SkyHawk models. Capacity selection can fall back to the largest available item if no item meets the target. This is a count-based rule, not a retention-days/bitrate calculator. [E4]

**Power recommendation:** prefer CP Plus Premium units with capacity sufficient for the camera count; capacity-based fallback is present. [E4]

**PoE recommendation:** smallest sufficient port/channel capacity, then cheapest product. No camera power-budget calculation was identified in this path. [E2]

**Rack and SD recommendation:** designated 4U rack and CP Plus 64GB microSD products, with catalogue fallbacks. Storage cards for standalone systems have fixed quantity equal to camera count; HDD has fixed quantity one. Optional backup memory cards allow quantity 1–64, initially equal to camera count. Power/rack/PoE quantity controls allow 1–20, initially one. [E2, E4]

Accessory tabs expose search, a dropdown, recommendation, item price, quantity, line amount, and an inclusion checkbox where optional. Picking a product or recommendation adds it to the quote. Optional excluded items show as not included. [E2]

## 5. Pricing behavior

The sidebar updates from the selected catalogue products without waiting for the final form submission:

1. Camera line amount = selected product's unit price × quantity.
2. Add one automatically matched recorder for HD/IP.
3. Add selected storage and included accessories.
4. Calculate each line in paise, applying 18% GST with per-line rounding.
5. Aggregate tax and show CGST 9% and SGST 9% for the preview.
6. Round the final payable amount to the nearest whole rupee and display the adjustment.

The public preview currently passes Rajasthan as both seller state and place of supply, irrespective of the Area selection. The shared invoice function supports IGST, but this preview call always uses its intra-state branch. Changing area, property type or mobile-viewing preference does not enter the client price calculation. No installation labor, cable-length charge, connector charge, travel, shipping or site-survey charge was identified in this calculator's line builder. These choices are collected for follow-up. [E2–E4]

Observed example: WiFi, CP Plus, two dome + two bullet cameras selecting the same model:

| Line | Calculation | Amount |
| --- | --- | --- |
| Cameras | 4 × ₹2,599 | ₹10,396 |
| 64GB microSD cards | 4 × ₹1,031 | ₹4,124 |
| Subtotal | | ₹14,520 |
| CGST 9% | | ₹1,306.80 |
| SGST 9% | | ₹1,306.80 |
| Rounding | | +₹0.40 |
| Final total | | **₹17,134** |

These are research-snapshot prices, not prices to hardcode into ViNexus. [E1]

## 6. Final form — complete field inventory

| Group | Fields | Required/conditional behavior visible in client |
| --- | --- | --- |
| Business/GST | Has GST Yes/No; GSTIN; Verify GST | Yes/No required. GSTIN required only for Yes, max 15 characters, uppercase and whitespace removed. |
| Contact | Full name, company/organization, mobile number, email, address | Name/mobile/email/address required; company optional. Mobile has minimum length 10. Address 10–500 characters. |
| Email verification | Send Code, six-digit code, Verify, resend, use another email | Verification token required at submit. Six-digit numeric code auto-verifies when complete; Enter also verifies. Resend timer starts at 60 seconds; server retry timing may override it. |
| Requirement | Service interest; requirement type | Both required. CCTV service and New Installation are prefilled; the component still exposes shared service/requirement dropdowns. |
| Project | Location/area, site type, estimated requirement/quantity, requirement description | Location and description required. Site type and quantity text optional. Description max 3,000 characters. |
| Contact preference | Call, WhatsApp or Email; preferred time | Contact method required; time optional. |

Additional exact options:

- Preferred time: Anytime, Morning 10 AM–12 PM, Afternoon 12 PM–4 PM, Evening 4 PM–7 PM.
- Requirement types: new installation, repair/troubleshooting, AMC/maintenance, upgrade/expansion, site survey/consultation, other.
- Site types: home, office, shop/showroom, factory/warehouse, school/institute, hospital/clinic, hotel/restaurant, other.
- Shared service dropdown contains 19 choices spanning CCTV, access control, biometrics, networking, IT support and AMC. Only the CCTV option is prefilled by this wizard. [E3, E5, E6]

Project location is prefilled from Area. Residential maps to Home, Small Business to Shop/Showroom, and Corporate to Office. Community & NGO has no explicit site mapping in the delivered client. Camera counts, system, recorder tier, selected storage and mobile viewing populate a readable quantity summary; the description gets an editable CCTV request summary. Prefill logic preserves user-edited values when navigating between steps. [E2, E5]

GST lookup can display a verified registration or a format-valid/manual-confirmation result, including business/trade name, GSTIN, state and status. Successful lookup prefills name/company and an empty address. Provider, uptime, exact backend validation and rate limits are not public evidence. [E3]

## 7. Submit and resulting quotation

The public client calls a server action named `createQuoteRequest`, submitting normal form data plus system type, area, property type, camera counts, inferred channel tier, mobile-viewing choice, brand, selected camera product IDs, accessory overrides, and optional originating product slug. It also submits the verified-email token. The frontend does not submit its displayed total as the authoritative quotation amount. Server-side price recalculation still needs verification or independent implementation. [E2]

The success UI has two branches:

- Priced quote: confirmation, a downloadable PDF link, a readonly/selectable quotation URL, an open-in-new-tab link, and email-delivery status. If delivery was not immediately confirmed it shows a pending-email message.
- Manual quote: request-received confirmation and a message that the team will confirm pricing after discussion/site review.

Both provide a way back to the homepage. Submission disables the final button and displays errors without discarding the form. No evidence in this wizard of cart checkout, payment, automatic WhatsApp order creation, or a WhatsApp-send step; the floating site WhatsApp link is separate. [E1, E2]

**Not verified:** actual PDF layout/content, quote number/validity rules, public-link permissions/expiry, email attachment contents, server persistence, admin management screens, staff notifications, price recalculation, backend validation and OTP security. Those cannot be inferred from success UI alone. No submission was made to test them.

## 8. Catalogue data needed for replication

The reference page receives structured categories: HD cameras, IP cameras, standalone cameras, DVRs, NVRs, HDDs, power supplies, memory cards, racks and PoE switches. The research response contained 280 records across these categories (34/30/17/11/45/14/21/25/30/53 respectively). WiFi and 4G lists are filtered from standalone names; not every standalone item matches. [E4, E6]

Required product attributes: stable product ID, name/model identifiers, brand, price, stock status, camera technology, camera style, recorder/switch/power capacity, HDD TB or memory-card GB. Recommendations also need designated preferred products or configurable preference rules. ViNexus should use its own catalogue, product variants and applicable customer/dealer/installer prices, rather than importing the reference site's products or prices.

## 9. ViNexus integration findings and decisions for the implementation phase

Local inspection found no existing equivalent CCTV configurator. ViNexus already has product variants, applicable dealer/installer pricing, enquiries, admin notifications, storage, and PDF generation for POS invoices. These are useful integration points, not evidence that quotation generation already exists.

| Decision | Why it needs an explicit implementation choice |
| --- | --- |
| Guest quote pricing vs sign-in | FixDaddy displays a live priced estimate without a login in the observed flow. ViNexus currently hides storefront prices from guests in `shared/storefrontPricing.js`; copying this behavior blindly would bypass that policy. |
| Pricing by account type | Retail, approved dealer and Installer dealer prices already differ. The calculator and saved PDF must use the same authoritative applicable price and markup rules. |
| Geography | Reference choices are Jaipur-specific. ViNexus is based in Kota; service areas must be configured for ViNexus rather than copied. |
| Installation costs | Decide whether the quote is hardware-only or includes labor/cabling/travel, and how admins configure those charges. The reference client does not calculate them. |
| Email verification | Decide whether already authenticated, verified customers reuse their session or follow a separate quote-email verification flow. |
| Admin destination | A dedicated quotations section or a typed enquiry workflow is a ViNexus design decision; the reference site's admin panel was not observed. |
| PDF and lifecycle | Confirm business branding, quote numbering, validity, terms, sharing/download permissions, manual-price handling and revisions. Exact PDF visual replication needs an actual reference PDF. |

Recommended implementation boundaries, for the next phase only:

- Add a storefront Quick CCTV Quotation entry and six-step page with retained selections and live itemization.
- Add explicit catalogue classifications/capacities and admin recommendation settings; do not depend entirely on interpreting product names.
- Recalculate on the server from valid product/variant IDs, stock and role-specific prices. Persist an immutable quote snapshot with customer details and selected items.
- Generate a ViNexus-branded quotation PDF and expose it only under the chosen access/expiry policy; reuse existing email and notification infrastructure where appropriate.
- Let admins view the request, handle manually priced configurations, and follow up. This is a proposed ViNexus requirement, not an observed FixDaddy admin feature.

## 10. Reference quirks to avoid copying as defects

- Displayed 4/8/16/32-channel tiers can disagree with real selected capacities such as 5, 9, 10, 20 or 64 channels.
- Camera count inputs advertise limits, but per-step navigation only checks a positive total and mobile preference; robust integer/range checks must also exist on the server.
- Fallbacks can select another camera style, another recorder brand, insufficient fallback accessory capacity, or low/out-of-stock products. Compatibility and stock handling need explicit rules.
- Brand-only recorder matching does not establish codec, camera-resolution, bandwidth or PoE-power compatibility.
- A required storage category can have no eligible item; unsupported configurations should become manual requests without fabricated totals.
- Community & NGO does not map automatically to a shared Site Type.
- GST preview is fixed to the home state in the delivered client; tax handling should follow ViNexus's configured commercial requirements rather than copying that assumption.

## Research completion

The publicly delivered configurator's steps, input fields, options, recommendation rules, accessory defaults, pricing math, request shape and success-screen contract are documented. Live final submission, OTP delivery, actual generated PDF and private admin behavior remain unverified. No application code, dependencies, repository permissions or deployment settings were changed for this research phase.
