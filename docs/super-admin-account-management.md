# Super-admin account management

Open **Dealer Accounts** (`/admin/dealer-accounts`) or **Customer Accounts** (`/admin/customers`). Super admins see **Create Dealer / Create Customer**, plus **Edit** and **Delete** on each account row. Existing **View** screens provide account details and enquiry history. Employees retain their existing section permissions, but cannot use these new CRUD controls or their APIs, even with account-section write access.

Creating a dealer immediately approves the new dealer profile without requiring uploaded KYC documents. The server records the acting super admin in **Verified by**, the approval timestamp, and an `admin` application source. Creating a customer does not create or approve a dealer application. Both account types use the existing OTP sign-in; the feature does not send a default password. New contact addresses are not marked OTP-verified automatically.

The editor supports contact name, email, Indian mobile number, address and account status. Dealer edits also support company name, organisation type, GSTIN, PAN, WhatsApp number, city, state and pincode. Editing an existing pending/rejected dealer does not approve it: use the separate Dealer Verification section for that action. Email/phone changes clear the corresponding verification state, unlink a changed Google email identity, and revoke existing sessions and outstanding OTPs. Duplicate email/phone returns a conflict without creating a partial account.

Deletion requires confirmation. It deletes the user, associated dealer profile, custom dealer prices, cart, login sessions, outstanding OTPs and push-device links atomically. Enquiries, POS invoices, audit records and previously uploaded media remain stored; financial history is not cascaded away. Customer routes cannot delete a dealer or admin, and dealer routes cannot delete a customer or admin. Dealer routes accept either the profile ID used by the directory or the user ID. Writes use the existing MongoDB transaction infrastructure.

API additions (authenticated super admins only):

- `POST /api/admin/customers` and `POST /api/admin/dealer-accounts`
- `PUT /api/admin/customers/:id` and `PUT /api/admin/dealer-accounts/:id`
- `DELETE /api/admin/customers/:id` and `DELETE /api/admin/dealer-accounts/:id`

POST and PUT accept only explicit editable fields; client-supplied roles, approval metadata and permission fields are rejected. GET routes and existing status/verification endpoints retain their established behavior.

Verification: `tests/api/adminAccountCrud.api.test.js` and `tests/e2e/accountManagement.spec.js`. These use mocked data; they do not create or delete production accounts.

## Employee deletion

**Teams & Access → Employees** now has a Delete action per employee. Only super admins can use `DELETE /api/admin/access/employees/:id`. The confirmation explains that login access, sessions, outstanding OTPs and push-device links are removed, while roles, past work and audit records remain. The endpoint rejects self-deletion and cannot delete super-admin or customer accounts. Failed deletion keeps the employee visible and can be retried.
