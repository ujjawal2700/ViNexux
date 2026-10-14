# Team access and the super admin logbook

Open **Admin → Team & Access**. Existing admin accounts remain super admins; no owner account is demoted. Only super admins can create or edit roles, create employees, reset their passwords, block their accounts, or open **Super Admin Logbook**.

## Set up the team

1. Open **Role studio** and create a named role. Catalog editor, POS operator and Support desk are editable starting points.
2. Choose **No access**, **Read only**, **Write only**, or **Read & write** for each section. B2C and B2B enquiries are separate scopes. Group shortcuts apply a choice to every section in that group.
3. Open **Employees → Add employee**. Enter their name, email, 10-digit Indian phone number, password and assigned role. Passwords are hashed, never returned to the browser or shown in the logbook.
4. Employees use the existing admin password-and-OTP login. Existing sessions receive changed permissions on their next API request. The sidebar refreshes its access profile on focus and every minute. Its collapsible categories and top search field show only accessible sections; groups with no accessible sections are omitted, including while searching. Restricted writes show “You don't have write access to this section.” without sending a prohibited mutation from the panel. The server independently enforces this rule.
5. Use **Delete** on a role card to remove an unused role. If any employees are assigned (including blocked accounts), a popup lists their names and emails with **Change role** shortcuts. Reassign every employee before deletion. The server checks again inside a transaction and prevents concurrent assignments from creating a dangling role.
6. Block an employee to revoke active sessions. Setting a new password also revokes their sessions. Disabling a role removes section access for every employee assigned to it.

Read and write are independent capabilities. Write includes create, update and delete operations. Write-only roles can call authorized mutation endpoints without browsing records; successful responses acknowledge the change without returning the record; the existing management screens require read access and display an explanation instead of exposing data. Use **Read & write** for employees operating those screens. Product management may also need read access to brands and categories for its lookup fields. Shared media uploads are a separate capability; product-specific image endpoints use product permissions.

Every protected admin endpoint checks the user's current database account and assigned role. A missing, deleted or disabled role grants no section access. Client-side navigation is a convenience; it does not grant permissions. Employees cannot promote themselves, edit other employee accounts, inspect the logbook, or inspect/revoke administrator sessions. Customer and dealer session management can be granted separately. Employee public storefront browsing remains available like any visitor.

## Logbook

Authenticated admin and employee database writes through application models are recorded with:

- Server timestamp, actor ID/name/email and role name at the time of the request.
- Section, request ID, endpoint, method, IP address and user agent.
- Collection/model, operation, document IDs, field differences and complete before/after snapshots.
- Browser-reported latitude/longitude, accuracy and capture time when available; otherwise an explicit unavailable, denied or timeout state.

The logbook is read-only in the application and restricted to super admins. Search by name, email, model/collection or record ID, and filter by section and date range. Displayed dates and times use **Asia/Kolkata (IST)**. **Inspect changes** shows side-by-side values, full snapshots and an optional map link. Passwords, password hashes, OTP material and authentication tokens are redacted, while the fact that a secret changed remains visible.

Collection writes, including insert batches, bulk writes and derived catalog updates, are intercepted after Mongoose has cast their arguments. Snapshots, database changes and journal entries share a MongoDB transaction. Concurrent edits therefore receive separate before/after values. A journal failure aborts its database write. An already active application transaction, such as POS checkout, is reused: a rollback removes its journal entries too. One request can produce multiple entries, correlated by request ID, because it can update several models.

The logbook begins after deployment; it does not reconstruct past edits. Unauthenticated login/OTP/session-rotation maintenance, external database tools/scripts and external storage or messaging services are outside this authenticated application-write journal. Direct administrative database access still needs its own database auditing and access controls. The application does not claim that browser coordinates prove physical presence.

## Location

The admin panel explains location collection and provides **Enable location**. The browser asks for permission. Location is watched only while the admin layout is open and sent with admin mutation requests. Leaving the panel stops the watch. The server validates ranges, accuracy and freshness (five minutes). Coordinates are client-reported and can be spoofed; an unavailable or denied location is never replaced with invented coordinates. A location denial does not prevent an otherwise permitted change, and remains visible in the logbook. Geolocation requires HTTPS or localhost and browser permission.

## Deployment and verification

Deploy backend and frontend together. **MongoDB must be a replica set or a transaction-capable sharded cluster**, such as Atlas (the same requirement as transactional POS checkout). On standalone MongoDB, authenticated admin writes return a clear audit-unavailable error and do not proceed. No extra collection setting or change-stream pre-image configuration is needed. Normal Mongoose initialization creates the roles, employee fields and journal indexes. Preserve the journal collection in backups; there is no automatic expiry or UI deletion endpoint.

The integration suite uses only an isolated test replica set on **127.0.0.1:27019**, a timestamped disposable database, and drops that database after testing. It never connects to the application's configured database:

```sh
npm --prefix backend run test:admin-access
```

Coverage includes employee creation, live role changes, read/write separation, B2C/B2B scope enforcement, legacy mutation aliases, administrator-session protection, exact concurrent stock diffs, location capture, secret redaction, journal-outage rollback, blocked sessions, bulk writes, and application-transaction rollback. Unit tests cover permission resolution and validation; browser tests cover Role studio, employee creation, the logbook, responsive layouts and permission-scoped employee navigation.
