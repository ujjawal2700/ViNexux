# Manual storefront filters — 3 November 2026

The storefront keeps three built-in groups: **Brands**, **Categories** (header categories), and **Main categories**. Subcategory browsing links remain available, but the subcategory sidebar group has been removed.

Additional sidebar groups come only from **Admin → Filters**. Product specifications and old category-specific filter definitions no longer create visible filter controls. Availability and inferred specification groups have been removed from both desktop and mobile sidebars. Old specification/availability/price query parameters are not forwarded by the storefront; the dedicated Low Stock page retains its own explicit purpose. Product sorting remains available.

## Example: Capacity

1. Open **Filters** in the admin sidebar and choose **New Filter**.
2. Enter **Capacity** and choose **Checkboxes** to allow multiple customer selections. Radio buttons and Dropdown each allow one customer selection.
3. Add options such as **64 GB**, **128 GB**, and **256 GB**.
4. For each option, choose **Assign products**, search by name/SKU/model, and check the relevant products. Choose **Done** to return to the editor.
5. Choose **Save Filter**. Assignments are applied together when the filter is saved.

A product can belong to multiple options or filters. Each option can have multiple assigned products, including drafts. Customers see only matching published products reachable through active categories. An additional group appears where it has matching products; disabled filters are hidden. Options with no current matches are hidden unless selected, so an existing selection can still be cleared.

Selecting multiple checkbox options means **any of those options**. Selecting options in different groups means products must match **every selected group**. Counts exclude the group's own selection when presenting alternatives and include the other active constraints. Pagination, search, brand/category selections, reload/back navigation, and the mobile drawer retain the selected filter IDs.

## Product and category forms

The old category-specific specification/filter inputs and category filter-definition builder are removed from the admin forms. Technical specifications, templates, product categories and brands remain ordinary product information. Existing specification data and legacy category definitions are preserved. Those definitions no longer impose required/option/type checks on product creation, updates, publication, or import; normal data-shape and product publication validation still apply.

## Filter library and editor

The admin page opens to a full-width library instead of a growing sidebar beside an empty form. Search matches filter names and option labels. Visibility controls show all, enabled or hidden filters; sorting supports storefront order, name and option count. The library displays 12 filters per page with compact option previews, display types, visibility badges and edit/delete actions. Assignment totals count product-to-option assignments, so a product assigned to two options counts twice here.

New Filter or a filter's edit action opens a dedicated editor. Large option sets use a scrollable list and an option search field. New options receive focus automatically; renaming a searched option retains focus. Product previews show the first three assignments, with the assignment picker available to manage all products. A live storefront preview demonstrates checkboxes, radio buttons or a dropdown. The save bar remains visible while scrolling. Back to filters checks for unsaved changes before leaving the editor.

The redesign was visually checked at 1440px and 390px with 40 filters and 40 options. The updated creation/editing/assignment/deletion flow, pagination, search, visibility, sorting, option editing, focus, discard confirmation and storefront filter regressions passed: 20 development-browser tests and 20 production-browser tests. The production build passed; lint reported no errors and the same 170 existing warnings.

## Implementation

- `ProductFilter` stores the filter name, type, enabled state, order and stable option IDs.
- `Product.filterOptionIds` stores assignments. The normal product create/update APIs do not expose assignment writes; they are managed through the Filters section.
- Creating/updating/deleting a filter and its assignments uses a MongoDB transaction. Removed options and deleted filters clear only their own assignments, preserving products and other filters.
- The new Filters section has independent employee read/write permissions.
- Admin API: `GET/POST /api/admin/filters`, `GET/PUT/DELETE /api/admin/filters/:id`, and paginated `GET /api/admin/filters/products` for the assignment picker.
- Storefront API: `customFilters` is a JSON map from filter IDs to option-ID arrays. Active definitions and contextual counts are returned in `facets.customFilters`. Stale/disabled selections return no matches rather than broadening results; malformed IDs and invalid single-choice selections are rejected.
- Legacy specification/availability API parameters and response fields remain available for compatibility with existing API consumers; the current storefront does not render or submit those controls.

Verification includes unit validation/permissions, real HTTP/database transactions and assignments, published/draft visibility, invalid assignment rollback, OR/AND selection behavior, contextual counts, hide/delete behavior, and desktop/mobile browser workflows. The old filter browser cases have been rewritten around the new manual-assignment behavior rather than left expecting the removed controls.

The category editor browser regressions now check that header, main, and subcategory forms have no old filter builder and do not overwrite preserved legacy definitions when ordinary category details are saved.

## Search resets

Editing the header search text immediately clears selected brands, categories, main categories and custom filters. The previous submitted query stays visible until the new query is submitted. Enter, the Search button (including a repeated or empty search), and recent-search submissions start with an unfiltered catalogue. Category and brand routes return to the global search catalogue. Filters can then be applied again normally.

The search reset follow-up adds desktop/mobile browser coverage for editing, repeated submission, empty submission, reapplying filters and leaving scoped category/brand routes. The request assertions distinguish catalogue pagination requests from header suggestions, which share the products endpoint.

## Verification results

- Unit: 527 passed across 51 suites.
- API: 269 passed across 7 suites.
- Backend integration: all 37 current files verified; 36 passed in the broad run and the catalogue test passed after its obsolete mandatory-filter assertions were replaced and rerun. The manual-filter lifecycle, product image/import, legacy API compatibility and product-sheet integrations also passed their focused runs.
- Complete development browser suite: 255 passed, no skips.
- Complete production browser suite: 244 passed; the existing 11 Firebase source-injection cases are development-only and passed in the development run.
- Final production build and whitespace checks passed. Lint completed with no errors and 170 warnings.

The final browser runs used separate artifact directories to prevent overlapping report cleanup. All database tests used disposable databases on the owned local replica set; cleanup was verified and the temporary server was stopped.
