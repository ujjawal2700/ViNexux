# Offline POS billing

Open **Admin → Offline POS Billing** (`/admin/pos`). This records in-store
sales in the existing connected admin system. Saving a sale, loading held
bills and sharing invoices require a connection to the backend.

## Counter workflow

1. Review **Invoice setup**. Seller, bank and declaration defaults come from
   the supplied invoice; changes apply only to future invoices.
2. Search a product by name, SKU or model. A keyboard-wedge scanner can enter
   a SKU or model number followed by Enter. F2 focuses the search.
3. Enter the customer's phone to look up saved details automatically. New
   numbers require OTP verification through the configured SMS provider.
   Capture or complete the name, WhatsApp, full address, city, state, GST state
   code and PIN. GSTIN and email are optional. F4 opens these fields. Save
   details adds/updates the main Customer Accounts directory, including a
   reusable POS billing address. Returning customers do not need another OTP.
   Shipping can use a separate address; delivery-reference inputs are removed.
4. Review quantity, price, discount, HSN/SAC, GST rate, unit and serial numbers.
   Product HSN/GST specifications supply defaults when present. Prices include
   GST by default; the pricing selector also supports prices excluding GST.
   The recorded state code determines CGST/SGST versus IGST.
   The breakdown lists the original item subtotal, discount, taxable amount,
   GST and final total separately. HSN classifies goods; SAC classifies services.
5. F8 checks customer, invoice setup, product fields and current stock before
   opening payment. Choose Cash, UPI or Bank. The payment amount is fixed to
   the complete bill total; credit, partial payments and split tender are not
   available. Errors identify the field and product. Customer or product errors
   received during completion can be corrected directly in the payment dialog.
6. Complete the sale to issue its numbered invoice and deduct catalogue stock.
   Download or print the A4 PDF, or use Send to WhatsApp. WhatsApp opens `wa.me`
   with a prefilled message and a private invoice link; the admin reviews and
   sends the message there. This does not use a WhatsApp Business API.

Held bills persist per admin and do not reserve stock. Their quantities are
checked against current stock at completion. Invoice numbering uses an atomic
counter per prefix and Indian financial year, beginning at 000001.

## Public invoice links

Production sharing points to `https://vinexus.in/invoices/<reference>`.
Local HTTP development uses `http://127.0.0.1:<frontend-port>/invoices/...`
to avoid HTTPS upgrades cached for localhost. `VITE_PUBLIC_SITE_URL` can
explicitly override the website origin. Rebuild after changing frontend
configuration; the API address remains independently set by `VITE_API_BASE_URL`.

Guests enter the purchase mobile number and verify the existing login SMS OTP
before seeing their invoice history. Logged-in customers find **My Invoices**
under their account (`/account/invoices`). View and Download PDF fetch invoices
through authenticated endpoints that check ownership. The shared reference
highlights the invoice only if it belongs to that account. New invoice links do
not expose the public PDF endpoint directly. Existing direct PDF links continue
working for compatibility.

The production website and API must be deployed with these routes and connect
to the database containing the sales. Links have no expiry; availability depends
on keeping the domain, backend and invoice records available. WhatsApp's `wa.me`
link prefills the customer portal URL; it cannot attach a file automatically.

## Sales register and corrections

Filter by invoice, customer, phone, date and sale status. Customer account detail
pages also link directly to the sales register filtered by that customer.
Dates and export timestamps use IST. The summaries show net sales after
returns, net received after refunds and refunds still due.

Completed invoice data is a snapshot. Later product, price or seller edits do
not change it. Returns
restore the selected quantities and create a numbered return entry. Voiding
restores the remaining sold quantities. Both retain payment history; record
refunds separately when actually paid. Returns allocate the original invoice's
round-off proportionally, and full returns reconcile exactly to its total.

Excel export produces four sheets: sales, line items, payments/refunds and
returns. It includes typed monetary values and dates, serial numbers, customer
details and audit references. Narrow the date range for exports over 10,000
sales.

## Persistence and access

- Collections: `PosSale`, `PosCounter`, `PosSettings`, `PosHeldBill`.
- Stock changes, counter increments and sale lifecycle changes use MongoDB
  transactions, as the existing enquiry completion flow does. The database
  must support transactions (a replica set or sharded cluster).
- Creation, payment, refund and return requests carry stable UUID retry keys.
  Repeated requests do not duplicate their stock or payment effects.
- New-customer OTPs are scoped to the admin and normalized phone, expire,
  enforce resend cooldowns and limit incorrect attempts. Verification proof is
  consumed when the customer is saved. Test codes are exposed only with the
  existing explicit mock-OTP setting; live mode uses the SMS provider.
- Phone-only POS customers are stored as real customer records without fake
  email addresses. Email remains required for ordinary website signup.
- All POS records and mutations require the existing authenticated admin role.
  Customer invoice history and PDF downloads require an authenticated
  customer/dealer and account ownership (or a verified primary phone for legacy
  invoices without a customer ID). Existing public PDF links use an unguessable
  256-bit invoice token. Public PDFs disable caching and indexing.
- The PDF includes the supplied logo, boxed invoice layout, HSN summary,
  amount words, bank details, declarations and signature areas. Long item and
  serial lists continue across pages; large HSN summaries use an annexure.
- Admin page crashes show the affected route and expandable error details.
  Refresh and Go back preserve browser storage and the admin session.

## Verification

`npm run test:unit -- --runInBand posBilling`

`npm run test:api -- --runInBand posBilling`

`npx playwright test tests/e2e/posBilling.spec.js --workers=1`

`npx playwright test tests/e2e/posCheckoutRecovery.spec.js --workers=1`

`npm --prefix frontend run build`

Transaction tests use a rollback-capable database test double. Browser tests
use mocked API responses. Validate the final flow against the deployment's
MongoDB replica set and printer before using it for live counter sales.
