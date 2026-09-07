# Vinexus Frontend Requirement Traceability Matrix

This document maps every major functional requirement from the PRD and backend architecture to its corresponding Frontend Screen, Backend API, Target User Role, and Implementation Status.

---

## Traceability Table

| PRD Module / Requirement | Frontend Screen / Component | Backend API Endpoint | Allowed Roles | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Authentication — OTP Request** | `/login` (Identifier Input) | `POST /api/auth/send-otp` | Public | `COVERED` |
| **Authentication — OTP Verify** | `/verify-otp` (OTP Modal) | `POST /api/auth/verify-otp` | Public | `COVERED` |
| **Authentication — Conflict Resolution** | Conflict Modal Dialog | `POST /api/auth/force-login` | Public | `COVERED` |
| **Authentication — Token Refresh** | Axios Interceptor | `POST /api/auth/refresh-token` | Public | `COVERED` |
| **User Profile Overview** | `/customer/profile`, `/dealer/dashboard` | `GET /api/auth/me` | Authenticated | `COVERED` |
| **User Session Logout** | Header Action Button | `POST /api/auth/logout` | Authenticated | `COVERED` |
| **Catalog — Categories View** | `/categories`, Header Dropdown | `GET /api/categories` | Public | `COVERED` |
| **Catalog — Product Search & Filter** | `/products` | `GET /api/products` | Public | `COVERED` |
| **Catalog — Product Details View** | `/products/:id` | `GET /api/products/:id` | Public | `COVERED` |
| **Cart — View Persistent Items** | `/customer/cart`, Cart Drawer | `GET /api/cart` | Customer, Dealer | `COVERED` |
| **Cart — Add Product & Quantity** | Product Card "Add to Cart" Button | `POST /api/cart/items` | Customer, Dealer | `COVERED` |
| **Cart — Update Item Quantity** | Cart Quantity Stepper | `PUT /api/cart/items/:productId` | Customer, Dealer | `COVERED` |
| **Cart — Remove Single Item** | Cart Item Delete Button | `DELETE /api/cart/items/:productId` | Customer, Dealer | `COVERED` |
| **Cart — Clear Entire Cart** | Cart Clear All Button | `DELETE /api/cart` | Customer, Dealer | `COVERED` |
| **Enquiry — Submit Form** | `/customer/checkout-enquiry` | `POST /api/enquiries` | Customer, Dealer | `COVERED` |
| **Enquiry — Customer History** | `/customer/enquiries` | `GET /api/enquiries` | Customer, Dealer | `COVERED` |
| **Enquiry — Customer Detail View** | `/customer/enquiries/:id` | `GET /api/enquiries/:id` | Customer, Dealer | `COVERED` |
| **Dealer — Register B2B Profile** | `/dealer/kyc` | `POST /api/dealers/profile` | Dealer | `COVERED` |
| **Dealer — Upload KYC Documents** | `/dealer/kyc` (File Uploader) | `POST /api/dealers/kyc/documents` | Dealer | `COVERED` |
| **Dealer — View KYC Status & Reason**| `/dealer/dashboard`, `/dealer/kyc` | `GET /api/dealers/profile` | Dealer | `COVERED` |
| **Dealer — Custom Pricing View** | `/dealer/pricing`, `/products` | `GET /api/products` | Approved Dealer | `COVERED` |
| **Admin — Metric Dashboard** | `/admin/dashboard` | `GET /api/admin/dashboard` | Admin | `COVERED` |
| **Admin — Category Management** | `/admin/categories` | `POST, PUT, DELETE /api/categories` | Admin | `COVERED` |
| **Admin — Product Management** | `/admin/products` | `POST, PUT, DELETE /api/products` | Admin | `COVERED` |
| **Admin — Dealer Directory & Filter**| `/admin/dealers` | `GET /api/admin/dealers` | Admin | `COVERED` |
| **Admin — Approve Dealer KYC** | `/admin/dealers/:id` | `PUT /api/admin/dealers/:id/kyc/approve` | Admin | `COVERED` |
| **Admin — Reject Dealer KYC** | `/admin/dealers/:id` (Modal) | `PUT /api/admin/dealers/:id/kyc/reject` | Admin | `COVERED` |
| **Admin — Dealer Price Overrides** | `/admin/dealer-pricings` | `POST, PUT, DELETE /api/admin/dealer-pricings` | Admin | `COVERED` |
| **Admin — Lead Management Table** | `/admin/enquiries` | `GET /api/admin/enquiries` | Admin | `COVERED` |
| **Admin — Assign Enquiry Status** | `/admin/enquiries/:id` | `PUT /api/admin/enquiries/:id/status` | Admin | `COVERED` |
| **Admin — Assign Admin to Lead** | `/admin/enquiries/:id` | `POST /api/admin/enquiries/:id/assign` | Admin | `COVERED` |
| **Admin — Add Note to Lead** | `/admin/enquiries/:id` | `POST /api/admin/enquiries/:id/notes` | Admin | `COVERED` |
| **Admin — Sync Sheet Manual Trigger** | `/admin/enquiries/:id` | `POST /api/admin/enquiries/:id/sync-google-sheet` | Admin | `COVERED` |
| **Admin — Resend WhatsApp Trigger** | `/admin/enquiries/:id` | `POST /api/admin/enquiries/:id/resend-whatsapp` | Admin | `COVERED` |
| **Admin — Active Sessions Audit** | `/admin/sessions` | `GET /api/admin/sessions` | Admin | `COVERED` |
| **Admin — Revoke Session** | `/admin/sessions` | `DELETE /api/admin/sessions/:id` | Admin | `COVERED` |
| **Admin — Reports Analytics** | `/admin/reports` | `GET /api/admin/reports/summary` | Admin | `COVERED` |
| **Admin — CMS Hero Banners** | `/admin/cms/banners` | `GET, POST, PUT, DELETE /api/admin/cms/banners` | Admin | `COVERED` |
| **Admin — CMS Static Pages** | `/admin/cms/pages` | `GET, POST, PUT, DELETE /api/admin/cms/pages` | Admin | `COVERED` |
| **Admin — File Upload Service** | Modals & Form Uploaders | `POST /api/admin/upload` | Admin | `COVERED` |

---

## Verification Summary
- **Total PRD Requirements Assessed**: 40 Core Features
- **Requirements Covered**: 40 (100%)
- **Uncovered / Missing Requirements**: 0
