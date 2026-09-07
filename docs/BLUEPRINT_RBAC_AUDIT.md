# Vinexus Blueprint RBAC Audit Matrix

This document provides a line-by-line verification comparing the **Official Growme PRD v1.0**, the **Actual Backend Code Authorization Middleware**, and the **FRONTEND_BLUEPRINT.md Specification**.

---

## 1. Feature-Level Authorization Audit Table

| Feature / Action | PRD Requirement | Actual Backend Authorization | Blueprint Permission | Audit Result |
| :--- | :--- | :--- | :--- | :---: |
| **Browse Product Catalog** | Guests & Customers see Standard Price; Approved Dealers see Discounted Price. | Public route (`GET /api/products`). Backend dynamically resolves user token if attached to render role-based price. | Guests, Customers, Dealers, Admin can view. | `PASS` |
| **Add Items to Cart** | Authenticated Customer or Dealer. | `authenticate, authorize('customer', 'dealer')` on `POST /api/cart/items`. | Customer & Dealer only. Admin/Guest restricted. | `PASS` |
| **Submit Enquiry** | Authenticated Customer or Dealer. | `authenticate, authorize('customer', 'dealer')` on `POST /api/enquiries`. | Customer & Dealer only. Admin/Guest restricted. | `PASS` |
| **View Personal Enquiry History** | Authenticated Customer or Dealer. | `authenticate, authorize('customer', 'dealer')` on `GET /api/enquiries`. Returns user-filtered list. | Customer & Dealer view own enquiries. | `PASS` |
| **Submit Dealer Profile & KYC** | Registered Dealer. | `authenticate, authorize('dealer')` on `POST /api/dealers/profile`. | Dealer role only. | `PASS` |
| **Upload KYC Document Files** | Registered Dealer. | `authenticate, authorize('dealer')` on `POST /api/dealers/kyc/documents`. | Dealer role only. | `PASS` |
| **View All System Enquiries** | Admin Staff. | `authenticate, authorize('admin')` on `GET /api/admin/enquiries`. | Admin role only. | `PASS` |
| **Update Enquiry Status & Notes** | Admin Staff. | `authenticate, authorize('admin')` on `PUT /api/admin/enquiries/:id/status` & `POST /api/admin/enquiries/:id/notes`. | Admin role only. | `PASS` |
| **Approve / Reject Dealer KYC** | Admin Staff. | `authenticate, authorize('admin')` on `PUT /api/admin/dealers/:id/kyc/approve` & `PUT /api/admin/dealers/:id/kyc/reject`. | Admin role only. | `PASS` |
| **Revoke Dealer Approved Status** | Admin Staff. | `authenticate, authorize('admin')` on `PUT /api/admin/dealers/:id/revoke`. | Admin role only. | `PASS` |
| **Manage Catalog (Products & Categories)** | Admin Staff. | `authenticate, authorize('admin')` on `POST, PUT, DELETE` routes in `adminCategory` & `adminProduct`. | Admin role only. | `PASS` |
| **Block / Unblock Customer** | Admin Staff. | `authenticate, authorize('admin')` on `PUT /api/admin/customers/:id/status`. | Admin role only. | `PASS` |
| **Audit Active Sessions & Revoke** | Admin Staff. | `authenticate, authorize('admin')` on `GET /api/admin/sessions` & `PUT /api/admin/sessions/:id/revoke`. | Admin role only. | `PASS` |
| **View Aggregate Reports** | Admin Staff. | `authenticate, authorize('admin')` on `GET /api/admin/reports/*`. | Admin role only. | `PASS` |
| **Manage Website CMS Content** | Admin Staff. | `authenticate, authorize('admin')` on `POST, PUT, DELETE` routes in `adminCms`. | Admin role only. | `PASS` |

---

## 2. Key RBAC Audit Findings
1. **Strict Role Isolation**: The backend uses `authorize('admin')`, `authorize('dealer')`, and `authorize('customer', 'dealer')` middleware across all private routes. No public user can escalate privileges or access administrative controls.
2. **Dealer Access Restrictions**: Pending or Rejected Dealers can log in and browse the product catalog, but receive `standardPrice` until their KYC status is marked `approved` by an Admin.
3. **Admin Exclusions**: System Admins cannot add items to a shopping cart or submit an enquiry via `/api/cart` or `/api/enquiries` (those endpoints are restricted to `customer` and `dealer` roles).
