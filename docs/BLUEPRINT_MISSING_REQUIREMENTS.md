# Vinexus Blueprint Missing Requirements Audit

This document identifies features or requirements present in the **Growme Vinexus PRD v1.0** or **Backend Source Code** that were underspecified or missing from `FRONTEND_BLUEPRINT.md`.

---

## Missing / Underspecified Items Table

| Item / Feature | Source | Description & Impact | Recommendation for Blueprint |
| :--- | :---: | :--- | :--- |
| **Public CMS Endpoint Base Path** | Backend Code (`src/routes/index.js`) | Public CMS content routes are mounted under `/api/content` (`GET /api/content/banners`, `/api/content/pages/:slug`, `/api/content/footer-content`) rather than `/api/cms/*`. | Update API endpoint mapping in documentation to reflect `/api/content/*` for public CMS and `/api/admin/cms/*` for admin CMS. |
| **Revoke Session Endpoint Method & Path** | Backend Code (`src/routes/adminSession.routes.js`) | Admin revokes an active session via `PUT /api/admin/sessions/:id/revoke` instead of `DELETE /api/admin/sessions/:id`. | Update Admin Session action mapping to use `PUT /api/admin/sessions/:id/revoke`. |
| **Product Image Upload Endpoint** | Backend Code (`src/routes/adminProduct.routes.js`) | Admin uploads product images via `POST /api/admin/products/:id/images` and deletes via `DELETE /api/admin/products/:id/images/:publicId` instead of a generic `/api/admin/upload`. | Update Product Management UI specs to use the dedicated `/api/admin/products/:id/images` endpoint. |
| **Revoke Approved Dealer Endpoint** | Backend Code (`src/routes/adminDealer.routes.js`) | Admin can revert an approved dealer back to standard pricing using `PUT /api/admin/dealers/:id/revoke`. | Add "Revoke Dealer Status" action button to Admin Dealer Management screen. |
| **Delete KYC Document Endpoint** | Backend Code (`src/routes/dealer.routes.js`) | Dealers can remove uploaded KYC documents via `DELETE /api/dealers/kyc/documents/:type` (where `:type` is `gst`, `aadhar`, or `pan`). | Add individual document delete controls on Dealer KYC Upload Form. |

---

## Impact Analysis
None of these missing items represent backend code bugs; they are **documentation path/method refinements** required to make `FRONTEND_BLUEPRINT.md` 100% accurate for frontend developers.
