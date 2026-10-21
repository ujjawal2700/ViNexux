# Inquiry, login and search fixes — 20 October 2026

## Findings and changes

- Saved-address validation allowed single-character address/city/state fields and address lines up to 255 characters. The inquiry endpoint instead required at least two characters and capped lines at 200. Valid saved addresses could therefore fail checkout. Both endpoints now accept the same address boundaries.
- Address-book mutations previously validated the entire user document, so incomplete legacy profile fields could prevent saving an otherwise valid address. Address saves now validate modified fields. An integration test uses an account missing both name fields and confirms that its address can be saved and its supplied checkout name is recorded in the enquiry.
- Checkout now shows individual contact/WhatsApp/message/address errors, scrolls to and focuses the first affected control, and displays server field details. Indian +91 phone numbers are normalized. A submit guard prevents concurrent requests.
- Toast context methods changed identity whenever a notification appeared. Checkout depended on that identity for loading the cart, causing notification-triggered reloads and loss of error focus. Context methods are now memoized; browser tests verify focus survives validation errors.
- Active out-of-stock products now have an availability-enquiry action on product cards and detail pages. Both account and guest carts retain positive inquiry quantities. Zero stock allows up to the existing API limit of 1,000 inquiry units; positive-stock cart limits are preserved. Enquiry submission does not deduct or reserve stock. Existing completion/fulfillment stock checks remain in place.
- Customer and admin OTP verification automatically submits six complete digits, including paste and operating-system autofill. Invalid codes show an error without automatic retry loops. Editing a digit triggers one new attempt. Manual retry and explicit confirmation for disconnecting an existing session remain available. Resends clear the previous code. The hard-coded fallback login phone was removed.
- Both storefront search placeholders now say “Search for CCTVs and related products.” Search matches case-insensitive model-number substrings, including punctuation. Derived search tokens include modelNumber, with a catalog version bump for startup backfill and a direct model match while that backfill is pending.
- Product detail offers “Order on WhatsApp” using the configured footer WhatsApp number and a product/model/quantity message. The existing cart button uses the same label. No message is sent automatically.
- Cart recommendations now resolve stored recently-viewed IDs to current product records, matching the history format introduced by the preceding browsing changes.

## Verification

- Unit suite: 390 tests passed.
- API suite: 232 tests passed, with local test-server binding enabled.
- Browser tests: inquiry/login suite (6), customer invoice suite (4), and catalog browsing suite (6) passed. These use mocked APIs and exercise automatic verification for both portals, ordinary digit correction, autofill, inquiry error focus, successful submission, guest out-of-stock persistence, and the WhatsApp link.
- Disposable database integration suites: inquiryFlow.test.js and catalogIntegration.test.js passed. The inquiry test exercises actual HTTP routing, validation, address persistence, zero-stock cart addition/update, enquiry storage, selected-item cart removal, unchanged stock, positive-stock limits, and model-number searches before/after edits and with legacy search tokens.
- Frontend production build passed. Frontend lint completed with warnings; no lint errors. git diff --check passed.

These changes were verified locally. The live frontend and backend must both be deployed for the production flow to receive the fixes. Production data and live messaging/storage services were not used in the tests.
