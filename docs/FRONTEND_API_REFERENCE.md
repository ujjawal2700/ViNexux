# Vinexus Frontend API Reference
*(Audited against Backend Source Code)*

This document serves as the technical API reference for frontend developers integrating with the Vinexus Node.js/Express backend API.

**Base URL**: `/api`  
**Authentication Header**: `Authorization: Bearer <accessToken>`

---

## 1. Authentication APIs (`/api/auth`)

### 1.1 POST /api/auth/send-otp
- **Access**: Public
- **Description**: Request an OTP code sent via SMS/Email/WhatsApp for signup or login.
- **Request Body**: `{ "identifier": "9876543210", "purpose": "login" }`
- **Response (200 OK)**: `{ "success": true, "message": "OTP sent successfully" }`

### 1.2 POST /api/auth/verify-otp
- **Access**: Public
- **Description**: Verify the 6-digit OTP code.
- **Response (200 OK - Standard)**: `{ "success": true, "data": { "user": {}, "accessToken": "...", "refreshToken": "..." } }`
- **Response (200 OK - Session Conflict)**: `{ "success": true, "data": { "sessionConflict": true, "conflictTicket": "..." } }`

### 1.3 POST /api/auth/force-login
- **Access**: Public
- **Description**: Force login when an active session conflict exists on another device.
- **Request Body**: `{ "conflictTicket": "..." }`
- **Response (200 OK)**: `{ "success": true, "data": { "user": {}, "accessToken": "...", "refreshToken": "..." } }`

### 1.4 POST /api/auth/refresh-token
- **Access**: Public
- **Description**: Obtain a new access token using a valid refresh token.
- **Request Body**: `{ "refreshToken": "..." }`
- **Response (200 OK)**: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

### 1.5 GET /api/auth/me
- **Access**: Authenticated (`customer`, `dealer`, `admin`)
- **Response (200 OK)**: `{ "success": true, "data": { "user": {} } }`

### 1.6 POST /api/auth/logout
- **Access**: Authenticated
- **Response (200 OK)**: `{ "success": true, "message": "Logged out successfully" }`

---

## 2. Public Content APIs (`/api/content`)

### 2.1 GET /api/content/banners
- **Access**: Public
- **Description**: Fetch active hero carousel banners.

### 2.2 GET /api/content/promotional-banners
- **Access**: Public
- **Description**: Fetch active promotional banners.

### 2.3 GET /api/content/pages/:slug
- **Access**: Public
- **Description**: Fetch static CMS page content by URL slug (e.g., `about-us`, `privacy-policy`).

### 2.4 GET /api/content/trust-badges
- **Access**: Public
- **Description**: Fetch active trust badges / "Why Vinexus" content blocks.

### 2.5 GET /api/content/footer-content
- **Access**: Public
- **Description**: Fetch public footer company contact details and quick links.

---

## 3. Product & Category APIs (`/api/categories`, `/api/products`)

### 3.1 GET /api/categories
- **Access**: Public
- **Query Params**: `page`, `limit`, `sortBy`, `sortOrder`, `parentId`

### 3.2 GET /api/products
- **Access**: Public (Role-aware pricing)
- **Query Params**: `page=1`, `limit=20`, `search=PVC`, `categoryId=xxx`, `isFeatured=true`
- **Response**: Returns product list with `standardPrice` for Guests/Customers and `dealerPrice` for Approved Dealers.

### 3.3 GET /api/products/:id
- **Access**: Public (Role-aware pricing)

---

## 4. Cart & Enquiry APIs (`/api/cart`, `/api/enquiries`)

### 4.1 GET /api/cart
- **Access**: Authenticated (`customer`, `dealer`)

### 4.2 POST /api/cart/items
- **Access**: Authenticated (`customer`, `dealer`)
- **Request Body**: `{ "productId": "...", "quantity": 2 }`

### 4.3 PUT /api/cart/items/:productId
- **Access**: Authenticated (`customer`, `dealer`)
- **Request Body**: `{ "quantity": 3 }`

### 4.4 DELETE /api/cart/items/:productId
- **Access**: Authenticated (`customer`, `dealer`)

### 4.5 DELETE /api/cart
- **Access**: Authenticated (`customer`, `dealer`)

### 4.6 POST /api/enquiries
- **Access**: Authenticated (`customer`, `dealer`)
- **Description**: Submits enquiry lead `VNX-XXXXXX`, clears cart, sends admin email, appends Google Sheet row.
- **Request Body**: `{ "contactPerson": { "name": "...", "email": "...", "phone": "..." }, "deliveryAddress": { "street": "...", "city": "...", "state": "...", "pincode": "..." }, "message": "..." }`

### 4.7 GET /api/enquiries
- **Access**: Authenticated (`customer`, `dealer`)
- **Description**: Fetch user's own submitted enquiries.

---

## 5. Dealer & KYC APIs (`/api/dealers`)

### 5.1 POST /api/dealers/profile
- **Access**: Authenticated (`dealer`)
- **Request Body**: `{ "companyName": "...", "gstin": "...", "pan": "...", "businessType": "...", "address": {} }`

### 5.2 GET /api/dealers/profile
- **Access**: Authenticated (`dealer`)

### 5.3 PUT /api/dealers/profile
- **Access**: Authenticated (`dealer`)

### 5.4 POST /api/dealers/kyc/documents
- **Access**: Authenticated (`dealer`)
- **Request**: `multipart/form-data` with field `file`.
- **Response**: `{ "success": true, "data": { "file": { "url": "...", "publicId": "..." } } }`

### 5.5 DELETE /api/dealers/kyc/documents/:type
- **Access**: Authenticated (`dealer`)
- **Path Parameter**: `:type` is `gst`, `aadhar`, or `pan`.

---

## 6. Admin Management APIs (`/api/admin`)

### 6.1 GET /api/admin/dashboard
- **Access**: Admin (`role: admin`)

### 6.2 Dealer Management (`/api/admin/dealers`)
- `GET /api/admin/dealers` — List dealer applications by status (`pending`, `approved`, `rejected`).
- `GET /api/admin/dealers/:id` — Inspect dealer profile details and KYC document URLs.
- `PUT /api/admin/dealers/:id/kyc/approve` — Approve KYC and activate dealer account.
- `PUT /api/admin/dealers/:id/kyc/reject` — Reject KYC with `{ "rejectionReason": "..." }`.
- `PUT /api/admin/dealers/:id/revoke` — Revoke approved dealer status back to pending.

### 6.3 Product Management (`/api/admin/products`)
- `POST /api/admin/products` — Create product (`standardPrice`, `dealerPrice`, etc.).
- `PUT /api/admin/products/:id` — Update product fields.
- `POST /api/admin/products/:id/images` — Upload product image via `multipart/form-data` field `file`.
- `DELETE /api/admin/products/:id/images/:publicId` — Delete product image.

### 6.4 Lead / Enquiry Management (`/api/admin/enquiries`)
- `GET /api/admin/enquiries` — List/filter all system enquiries.
- `PUT /api/admin/enquiries/:id/status` — Change status (`new`, `contacted`, `in-progress`, `closed`, `spam`) with optional internal note.
- `POST /api/admin/enquiries/:id/sync-google-sheet` — Manually trigger Google Sheet row append.
- `POST /api/admin/enquiries/:id/resend-whatsapp` — Manually trigger WhatsApp notification.

### 6.5 Session Audit Management (`/api/admin/sessions`)
- `GET /api/admin/sessions` — List all active user device sessions.
- `PUT /api/admin/sessions/:id/revoke` — Revoke an active user session.

### 6.6 Admin CMS Management (`/api/admin/cms`)
- `GET/POST/PUT/DELETE /api/admin/cms/banners` — Hero Carousel Banners.
- `POST /api/admin/cms/banners/:id/image` — Upload Banner Image.
- `GET/POST/PUT/DELETE /api/admin/cms/promotional-banners` — Promotional Banners.
- `GET/POST/PUT/DELETE /api/admin/cms/pages` — CMS Static Pages.
- `GET/POST/PUT/DELETE /api/admin/cms/trust-badges` — Trust Badges.
- `GET /api/admin/cms/footer-content` — Fetch Admin Footer Content.
- `PUT /api/admin/cms/footer-content` — Update Admin Footer Content.
