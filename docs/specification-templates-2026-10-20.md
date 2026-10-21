# Specification templates and richer product sharing

## Admin use

Open **Products → Add/Edit Product → Specifications → Specification templates**.

- Create multiple named templates, such as “4MP PoE Bullet Camera” and “12V Adapter”, with ordered specification names and values.
- Use **Save current specs as template** to turn an existing product's specifications into a reusable starting point.
- Search by template name or description, then select **Apply [template name]**. Missing specification groups are added and empty groups filled. Existing non-empty product values are preserved. Multiple values for a single specification, such as Connectivity, are supported.
- Edit the copied names and values directly in the product specification rows. Category-owned specifications continue to use their existing category controls. Drag ordering remains available. Save the product normally after reviewing the copied data.
- Templates can be renamed, edited, reordered or deleted. Product specifications are independent snapshots: changes to a template do not change previously saved products. A template update made in another admin session produces a revision conflict rather than silently overwriting the newer version.

The template library is stored in MongoDB and shared across authorized admins. It uses the existing Products read/write permissions. Customer accounts cannot access it, and employees with Products read-only access cannot create, update or delete templates. Inventory quantities are excluded from templates; stock continues to use the stock controls.

The library uses `/api/admin/products/specification-templates` for paginated search and creation, plus `/:templateId` for updates/deletion. Templates allow 1–100 ordered rows; names are unique ignoring case and repeated whitespace. Invalid rows, exact duplicate specification/value pairs, and inventory fields produce field-specific validation errors.

## Product sharing

Initial sharing HTML and client-side metadata now include the product photo and name, model number when available, and the first four specification groups in the product's saved display order. Repeated values are grouped. Inventory fields are excluded, and descriptions are kept within 300 characters. Products without technical specifications fall back to their description. Image alternative text uses the product name. HTML is escaped before insertion into Open Graph/Twitter tags.

The preceding Vercel/nginx initial-HTML rendering changes remain required for sharing apps. This work is local and still needs deployment with those changes; no production data was changed during verification.

## Verification

- 425 unit tests passed, including snapshot independence, preserving edited values, multi-select groups, template validation and richer metadata.
- 236 API tests passed.
- 16 browser tests passed across specificationTemplates, catalogBrowsing and storefrontControls. New cases cover creating/saving/searching/applying templates, editing copied product values, new-product use, undo, copying an existing product into a template, template updates/deletion, persistence and client metadata.
- The real HTTP/database specTemplates and storefrontControls suites passed for CRUD, search, pagination, customer/read-only permissions, duplicate names, invalid rows, stale revisions, product snapshot independence and initial sharing HTML without running JavaScript.
- Production build, lint (warnings only) and git diff --check passed.
