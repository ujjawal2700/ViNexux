# Vinexus Frontend Master Blueprint & Development Specification
*(Based on Official Growme Vinexus PRD v1.0 & Audited MERN Backend APIs)*

---

## Document Overview
This document is the **validated master implementation blueprint** for building the **Vinexus Frontend Web Application** using React.js. It bridges the official Product Requirements Document (PRD v1.0) and the fully tested Vinexus Node.js/Express/MongoDB backend API (77 endpoints).

> **IMPORTANT**: Follow this document step-by-step during frontend development. All API paths, HTTP methods, field names, and user permissions are verified against backend source code.

---

## 1. Project Overview & Business Domain

### 1.1 Business Model
Vinexus is an online **Lead Generation & Product Catalog Platform** for a leading **CCTV & Security Equipment Dealer** in India. 
- **Product Range**: CCTV Cameras (e.g. TrueView, CP Plus, Hikvision), DVRs/NVRs, Modems, Routers, LAN Wires, and Security Accessories.
- **Lead-Gen Only (Non-Transactional)**: There is **NO online payment, checkout, or shipping tracking**. Instead, users build a shopping cart and choose between:
  1. **Option A — Chat on WhatsApp**: Opens a direct `wa.me` deep-link with a pre-filled text message listing cart items, quantities, and prices shown.
  2. **Option B — Send Enquiry**: Submits a formal enquiry form which saves the lead (`VNX-XXXXXX`) to the database, sends an admin email alert, and appends a row to a connected Google Sheet via Google Sheets API.
- **Dual-Pricing Model**:
  - **Standard Price**: Visible to Guests, Retail Customers, and Pending Dealers.
  - **Discounted (Wholesale) Price**: Unlocked exclusively for Admin-Approved / Verified Dealers across the catalog.
- **Single Active Session**: Enforces single-device login per account with a conflict popup and force-login option.

---

## 2. User Roles & Access Control (RBAC)

| Role | Catalog Browsing | Price Level Seen | Cart & Enquiry | Submit KYC | Approve KYC | Admin CMS & Leads |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Guest (Visitor)** | ✅ | Standard Price | ✅ (Login required to submit) | ❌ | ❌ | ❌ |
| **Customer** | ✅ | Standard Price | ✅ | ❌ | ❌ | ❌ |
| **Dealer (Pending Review)** | ✅ | Standard Price (Fallback) | ✅ | ✅ (GST, Aadhar, PAN) | ❌ | ❌ |
| **Dealer (Approved)** | ✅ | Discounted Wholesale Price | ✅ | ✅ (View/Re-upload) | ❌ | ❌ |
| **Admin** | ✅ | Both Prices | ❌ (View Only) | ❌ | ✅ | ✅ |

---

## 3. Frontend Panels & Layout Architecture

The application requires three distinct frontend panel structures built over a shared React SPA router:

### 3.1 Public & Customer Panel
- **Layout Shell**: `PublicLayout` (Header with logo, search bar, category dropdown, Cart counter badge, Auth status widget, and CMS-driven Footer).
- **Primary Pages**: Homepage, Product Catalog, Category Browser, Product Detail, Cart Drawer/Page, Checkout Enquiry Form, Customer Account Dashboard.

### 3.2 Dealer Panel
- **Layout Shell**: `DealerLayout` (Includes top alert banner for KYC status + Dealer Sidebar menu).
- **Primary Pages**: Dealer Overview, KYC Document Upload & Status Center, Dealer Wholesale Catalog, Bulk Enquiry History.

### 3.3 Admin Panel
- **Layout Shell**: `AdminLayout` (Left collapsible sidebar, top breadcrumb bar, system alert drawer, session user control).
- **Primary Pages**: Admin Dashboard, Category Management, Product Management, Website CMS Builder, Enquiry Lead Management, Customer Directory, Dealer KYC Verification Queue, Session Audit Manager, Reports & Analytics.

---

## 4. Authentication & Single Active Session Flow

### 4.1 Authentication Steps
1. **Request OTP (`POST /api/auth/send-otp`)**:
   - User inputs Email or 10-digit Indian Mobile Number (`identifier`).
   - OTP code (6 digits) is dispatched via SMS/Email/WhatsApp.
2. **Verify OTP (`POST /api/auth/verify-otp`)**:
   - User inputs 6-digit OTP code.
   - **Session Conflict Check**:
     - If user is already logged in on another device, API returns `200 OK` with `{ sessionConflict: true, conflictTicket: "..." }`.
     - Frontend opens **Session Conflict Confirmation Modal**: *"You are currently logged in on another device. Do you want to log out from there and continue here?"*
     - User clicks **"Log out other device & continue"** $\rightarrow$ dispatches `POST /api/auth/force-login` with `{ conflictTicket }`.
     - User clicks **"Cancel"** $\rightarrow$ aborts login.
   - If no conflict: API issues `{ user, accessToken, refreshToken }`.

### 4.2 Client Token Storage & Refresh Strategy
- **Access Token (15m)**: Kept in React State / Memory. Attached via Axios header `Authorization: Bearer <accessToken>`.
- **Refresh Token (7d)**: Stored in `localStorage` or `httpOnly` cookie.
- **Axios Interceptor**: Automatically intercepts HTTP `401 Unauthorized` responses, calls `POST /api/auth/refresh-token`, updates memory token, and retries original request.

---

## 5. Navigation & Route Structure

### Public & Shared Routes
- `/login` — Multi-identifier Login (Email / Mobile Phone)
- `/verify-otp` — OTP Code Verification & Conflict Handler
- `/products` — Public Product Catalog with search, filter & pagination
- `/products/:id` — Product Detail View
- `/categories` — Category Hierarchy View
- `/content/pages/:slug` — Dynamic Public CMS Pages (Terms, Privacy, About Us)
- `/unauthorized` — HTTP 403 Access Denied Error Page
- `/not-found` — HTTP 404 Route Not Found Page

### Customer Routes (`role: customer`)
- `/customer/dashboard` — Customer Home / Recent Enquiries Overview
- `/customer/cart` — Cart Item Management & Price Snapshot Review
- `/customer/checkout-enquiry` — Enquiry Submission & Contact/Address Form
- `/customer/enquiries` — Personal Enquiry History List
- `/customer/enquiries/:id` — Enquiry Detail & Status Audit View
- `/customer/profile` — Customer Profile Overview

### Dealer Routes (`role: dealer`)
- `/dealer/dashboard` — Dealer Portal Overview & KYC Status Banner
- `/dealer/kyc` — Dealer Profile Setup & KYC Document Upload Form
- `/dealer/kyc/status` — Live KYC Status Verification & Rejection Reason Review
- `/dealer/pricing` — Custom Dealer Pricing Catalog View
- `/dealer/cart` — Commercial Cart Management
- `/dealer/enquiries` — Bulk Enquiry History List
- `/dealer/enquiries/:id` — Commercial Enquiry Detail View

### Admin Protected Routes (`role: admin`)
- `/admin/dashboard` — Administrative System Overview & Aggregate Counters
- `/admin/categories` — Category Management (Create, Edit, Toggle Active, Delete)
- `/admin/products` — Product Catalog Management (Create, Edit, Upload Image, Soft Delete)
- `/admin/dealers` — Dealer Directory & Verification Queue
- `/admin/dealers/:id` — Dealer Profile Inspection & KYC Approval/Rejection/Revoke Action Panel
- `/admin/customers` — Customer Directory & Block/Activate Controls
- `/admin/enquiries` — Lead Management Table (Filter, Update Status, Sync Sheets, Resend WhatsApp)
- `/admin/enquiries/:id` — Full Enquiry Audit Trail & Admin Note History
- `/admin/sessions` — Active Session Directory & Force Revoke Controls
- `/admin/reports` — Analytics Dashboard (Summary, Enquiries, Dealers, Customers)
- `/admin/cms/banners` — Hero Banner Management
- `/admin/cms/promotional-banners` — Promotional Banner Management
- `/admin/cms/pages` — CMS Static Page Editor
- `/admin/cms/trust-badges` — Trust Badge Configuration
- `/admin/cms/footer-content` — Footer Content & Contact Details Editor

---

## 6. Public vs Admin Endpoint Mapping

| Feature / Resource | Public Endpoint | Admin Endpoint | Access |
| :--- | :--- | :--- | :---: |
| **Hero Banners** | `GET /api/content/banners` | `GET/POST/PUT/DELETE /api/admin/cms/banners` | Public / Admin |
| **Promo Banners** | `GET /api/content/promotional-banners` | `GET/POST/PUT/DELETE /api/admin/cms/promotional-banners` | Public / Admin |
| **Static CMS Pages** | `GET /api/content/pages/:slug` | `GET/POST/PUT/DELETE /api/admin/cms/pages` | Public / Admin |
| **Trust Badges** | `GET /api/content/trust-badges` | `GET/POST/PUT/DELETE /api/admin/cms/trust-badges` | Public / Admin |
| **Footer Content** | `GET /api/content/footer-content` | `GET/PUT /api/admin/cms/footer-content` | Public / Admin |
| **Product Images** | Standard URL rendering | `POST /api/admin/products/:id/images`, `DELETE /api/admin/products/:id/images/:publicId` | Admin |
| **Active Sessions** | N/A | `GET /api/admin/sessions`, `PUT /api/admin/sessions/:id/revoke` | Admin |
| **Dealer Status Revoke**| N/A | `PUT /api/admin/dealers/:id/revoke` | Admin |
| **KYC Document Delete** | N/A | `DELETE /api/dealers/kyc/documents/:type` | Dealer |

---

## 7. Screen Inventory & Page-by-Page Requirements

### 7.1 Public & Customer Screens

#### Screen 1: Homepage (`/`)
- **CMS Managed Blocks**:
  - Hero Carousel Slides (`GET /api/content/banners`)
  - Featured Categories Grid (`GET /api/categories`)
  - Featured Products Section (`GET /api/products?isFeatured=true`)
  - Promotional Banner Strip (`GET /api/content/promotional-banners`)
  - "Why Vinexus" / Trust Badges Block (`GET /api/content/trust-badges`)
  - Dynamic Footer with quick links & social icons (`GET /api/content/footer-content`)

#### Screen 2: Product Catalog & Search (`/products`)
- **API**: `GET /api/products`, `GET /api/categories`
- **Filters**: Category/Subcategory sidebar, Brand filter (e.g. TrueView, Hikvision, CP Plus), Availability (In Stock / Out of Stock / On Request), Price Range.
- **Sort Options**: Price (Low to High / High to Low), Newest, Popularity.
- **Price Display Logic**: Displays **Standard Price** to Guests/Customers/Pending Dealers; displays **Discounted Wholesale Price** to Approved Dealers.

#### Screen 3: Product Detail Page (`/products/:id`)
- **API**: `GET /api/products/:id`
- **Elements**: Image gallery with zoom, Brand, SKU, Dynamic Specifications table (key-value pairs), Price, Quantity selector, "Add to Cart" button.

#### Screen 4: Cart Page / Drawer (`/customer/cart`)
- **API**: `GET /api/cart`, `PUT /api/cart/items/:productId`, `DELETE /api/cart/items/:productId`, `DELETE /api/cart`
- **Actions**:
  - **Button A — "Chat on WhatsApp"**: Opens `wa.me/<admin-phone>?text=<encoded_cart_summary>`.
  - **Button B — "Send Enquiry"**: Opens `/customer/checkout-enquiry`.

#### Screen 5: Checkout Enquiry Form (`/customer/checkout-enquiry`)
- **API**: `POST /api/enquiries`
- **Form Fields**: Contact Name, Email, Phone Number, Delivery Address (Line 1, Line 2, City, State, Pincode), Optional Customer Message.
- **On Submit**: Creates enquiry `VNX-XXXXXX`, clears cart, sends admin email, appends Google Sheet row, redirects to Enquiry Confirmation screen.

#### Screen 6: Customer Enquiry History (`/customer/enquiries`)
- **API**: `GET /api/enquiries`
- **Elements**: Table of submitted enquiries showing Enquiry Number, Date, Total Amount, Status Badge (`new`, `contacted`, `in-progress`, `closed`, `spam`), View Details modal.

---

### 7.2 Dealer Screens

#### Screen 7: Dealer Dashboard (`/dealer/dashboard`)
- **API**: `GET /api/dealers/profile`, `GET /api/auth/me`
- **Elements**: Top KYC Status Banner:
  - 🟡 **Yellow Alert (Pending)**: "Your KYC documents are under review by Vinexus Admin. Standard pricing applies until verified."
  - 🟢 **Green Alert (Approved)**: "Verified Dealer Account! Wholesale pricing is unlocked across the catalog."
  - 🔴 **Red Alert (Rejected)**: "KYC Verification Rejected. Reason: [Rejection Reason]. Click here to update documents."

#### Screen 8: Dealer KYC Submission (`/dealer/kyc`)
- **API**: `POST /api/dealers/profile`, `PUT /api/dealers/profile`, `POST /api/dealers/kyc/documents`, `DELETE /api/dealers/kyc/documents/:type`
- **Fields & Controls**:
  - Company Name, Business Type (Proprietorship, Partnership, Pvt Ltd, etc.)
  - GST Number + GST Document File Upload & Delete Control
  - Aadhar Number + Aadhar Document File Upload & Delete Control
  - PAN Number + PAN Document File Upload & Delete Control
  - Business Address Details

#### Screen 9: Dealer Wholesale Catalog (`/dealer/pricing`)
- **API**: `GET /api/products`
- **Elements**: Shows Wholesale Discounted Price alongside Standard Price (or wholesale savings tag) for Approved Dealers.

---

### 7.3 Admin Panel Screens

#### Screen 10: Admin Dashboard (`/admin/dashboard`)
- **API**: `GET /api/admin/dashboard`
- **Widgets**: Snapshot Cards (Enquiries, Pending KYC, Products, Categories, Customers, Dealers), Recent Enquiries Feed, Status charts.

#### Screen 11: Category Management (`/admin/categories`)
- **API**: `GET, POST, PUT, DELETE /api/categories`
- **Features**: Category & Subcategory tree view, parent category assignment (with circular reference check), sort order, active/inactive toggle.

#### Screen 12: Product Management (`/admin/products`)
- **API**: `GET, POST, PUT, DELETE /api/products`, `POST /api/admin/products/:id/images`, `DELETE /api/admin/products/:id/images/:publicId`
- **Features**: Product table, search by SKU/name, dynamic key-value spec editor, standard vs dealer price input (`standardPrice`, `dealerPrice`), stock status (`In Stock`, `Out of Stock`, `On Request`), image uploader modal.

#### Screen 13: Dealer KYC Verification Queue (`/admin/dealers`, `/admin/dealers/:id`)
- **API**: `GET /api/admin/dealers`, `PUT /api/admin/dealers/:id/kyc/approve`, `PUT /api/admin/dealers/:id/kyc/reject`, `PUT /api/admin/dealers/:id/revoke`
- **Features**: Filter dealers by status (`pending`, `approved`, `rejected`), Document Viewer modal for GST/Aadhar/PAN files, One-click "Approve" button, "Reject" modal with required `rejectionReason` text area, "Revoke Approved Dealer" button.

#### Screen 14: Lead / Enquiry Management (`/admin/enquiries`, `/admin/enquiries/:id`)
- **API**: `GET /api/admin/enquiries`, `PUT /api/admin/enquiries/:id/status`, `POST /api/admin/enquiries/:id/sync-google-sheet`, `POST /api/admin/enquiries/:id/resend-whatsapp`
- **Features**: Lead Table with date/status/user type filters, status workflow dropdown (`new` $\rightarrow$ `contacted` $\rightarrow$ `in-progress` $\rightarrow$ `closed` / `spam`), internal notes timeline, "Sync Google Sheet" manual trigger button, "Resend WhatsApp Notification" button.

#### Screen 15: Active Sessions Manager (`/admin/sessions`)
- **API**: `GET /api/admin/sessions`, `PUT /api/admin/sessions/:id/revoke`
- **Features**: View active user devices, IP addresses, and last active timestamps; force terminate session button (`PUT /api/admin/sessions/:id/revoke`).

#### Screen 16: Reports & Analytics (`/admin/reports`)
- **API**: `GET /api/admin/reports/summary`, `GET /api/admin/reports/enquiries`, `GET /api/admin/reports/dealers`, `GET /api/admin/reports/customers`
- **Features**: Date range picker (`startDate`, `endDate`), aggregate lead conversion counts, top enquired categories, dealer onboarding funnel.

#### Screen 17: CMS Management (`/admin/cms/*`)
- **API**: Hero Banners, Promotional Banners, Pages, Trust Badges, Footer Content (`GET/PUT /api/admin/cms/footer-content`) CRUD APIs.
- **Features**: Homepage banner manager, static page HTML editor with script tag XSS warning, trust badge icons editor, footer contact info editor.

---

## 8. Detailed Form Validation Rules

1. **Login Identifier**: Must be valid email or 10-digit Indian Mobile (`^[6-9]\d{9}$`).
2. **OTP Code**: Exactly 6 numeric digits (`^\d{6}$`).
3. **GSTIN**: 15-character uppercase alphanumeric string (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
4. **PAN**: 10-character uppercase alphanumeric string (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).
5. **Aadhar**: 12-digit numeric string (`^\d{12}$`).
6. **File Uploads**: Maximum 5 MB per file. Accepted types: `.jpg`, `.png`, `.webp`, `.pdf`.

---

## 9. Recommended Frontend Implementation Order

```
PHASE 11 — Project Setup (React + Vite, TailwindCSS, Axios Interceptors, Router Setup, Auth Context)
   │
   ▼
PHASE 12 — Shared UI Primitives (Button, Modal, Input, Table, Drawer, Toast, Skeleton, StatusBadge)
   │
   ▼
PHASE 13 — Public & Customer Panel (Homepage, Catalog, Product Detail, Cart Drawer, Enquiry Checkout)
   │
   ▼
PHASE 14 — Dealer Panel (Dealer Dashboard, KYC Upload Form for GST/Aadhar/PAN, Wholesale Catalog)
   │
   ▼
PHASE 15 — Admin Panel Core (Dashboard, Category Tree, Product Management, Dealer KYC Audit Queue)
   │
   ▼
PHASE 16 — Admin Panel Advanced (Enquiry Lead Manager, Sessions Audit, Reports, Website CMS Builder)
   │
   ▼
PHASE 17 — Integration Verification, Responsive Mobile Polish & Production Build Optimization
```

---

## 10. Summary
All 40 functional requirements from the Vinexus PRD v1.0 and 77 backend API endpoints are fully aligned and audited. Follow the step-by-step phases above during frontend coding!
