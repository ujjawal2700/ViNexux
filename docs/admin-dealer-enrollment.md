# Admin dealer enrollment

Super admins can create a complete dealer account from **Dealer Accounts → Create Dealer**, or open **Customer Accounts → View → Convert to Dealer** to upgrade an existing customer. Employee admins do not receive these account-management privileges.

Both flows require company name. Organisation type, GSTIN, PAN, Aadhaar number, WhatsApp number, business address, city, state, pincode, office latitude/longitude and all document uploads are optional for admin-created or admin-converted dealers. New accounts also require the holder’s name, email and mobile number. Udyam registration and certificate are optional; an optional PAN card can also be uploaded. Files use the existing KYC pipeline and accept PDF/JPG/PNG/WebP/SVG up to 5 MB each.

The save action uploads the documents and creates/approves the dealer with server-owned verifier attribution. Conversion requires an active customer account; activate a blocked or pending account first. The customer’s ID, contact verification, linked Google login, cart, enquiries and invoice history remain intact. Their old sessions and push registrations are invalidated so they sign in again with the correct role.

Provided details are validated using the existing dealer-profile schema. Customer self-service registration requirements are unchanged. Multipart requests contain JSON in `details` and optional files in `gst`, `aadhaar`, `msme` and `pan`. Document URLs and approval metadata cannot be supplied by the client. Conversion accepts business details only and cannot change the existing customer’s contact identity. User role, dealer profile, approval attribution and session invalidation are committed together in a MongoDB transaction. Uploaded files are cleaned up when storage or database operations fail.

Endpoints: `POST /api/admin/dealer-accounts` for creation and `POST /api/admin/customers/:id/convert-to-dealer` for conversion. Existing edit/delete endpoints retain their behavior. Existing customer applications are reused when converting, rather than creating another account or profile. Deploy the backend and frontend together. This change does not modify existing dealer accounts automatically.

Tests cover complete enrollment, missing required data/documents, invalid uploads, forged metadata, permissions, duplicate identifiers, cleanup on failure, identity preservation, session revocation, and browser creation/conversion/retry flows. API persistence is mocked; production data and storage providers are not touched.
