# Search and catalog filters

## Fixed behavior

The catalog now supports independent Header categories, Main categories and Subcategories, plus brands, specifications and availability. Multiple values within one group are combined with OR; different groups are combined with AND. For example, Bullet or Dome plus 4 MP or 8 MP plus PoE returns either camera type at either resolution, provided it supports PoE. Category selections include descendant categories and secondary product assignments.

Filter options come from the full active search context, including a fixed Trending/Low Stock view when applicable. Selecting filters no longer removes the other options. Zero-count options remain visible and selectable, so an empty combination can be changed without resetting everything. Counts apply the other groups but omit the option's own group, allowing additional OR choices to show their potential matches. Parent counts deduplicate products assigned to several sibling categories or explicitly assigned to an ancestor as well as its descendants.

Technical filters are shown even below 13 results. The former frontend limit of six specification groups and backend limit of eight groups were removed. Repeated specification rows on the same product are counted once per key/value pair, and equivalent key casing is grouped. Inventory/internal fields remain excluded from the technical filter list.

Selections are held in the URL. Category changes preserve search text, brands, specifications and availability; reload and Back restore them. Changing filters resets pagination to page one. Page/sort-only changes reuse existing facets. Unchecking every availability option now produces zero products, instead of silently disabling availability filtering.

The catalog was also being remounted for every query-string change. That reset the controls and closed the mobile drawer after a selection. Query changes now retain the mounted page; the mobile drawer stays open while multiple filters are selected.

Brand routes use the server's resolved brand name, including punctuation and custom slugs, when combining brands. Exact searches with an incompatible filter do not switch to unrelated fuzzy results. Typo-corrected search contexts retain their options even when the selected combination has zero matches.

## Implementation and deployment

New optional public product-query parameters are `headerCategory`, `mainCategory` and `subCategory`, with comma-separated IDs or slugs. Legacy `category`, `categoryId` and hierarchical routes remain supported. `availability=none` explicitly represents an empty availability selection. The API includes category levels, descendant-aware counts, base-context counts, and the resolved brand name for a brand URL.

These are local changes. Deploy the frontend and backend together: the updated frontend uses the new grouped category parameters.

## Verification

- 436 unit tests passed, including category levels, legacy URLs, multi-selection, duplicate parent-count prevention and safe specification parsing.
- 236 API tests passed.
- Seven search-filter browser tests and six catalog-browsing browser regressions passed. Coverage includes desktop and mobile selection, zero-result recovery, reload/Back, category-route transitions, pagination/facet reuse, availability with no choices, and canonical brand names on custom brand URLs.
- Real HTTP/database filterFlow and catalogIntegration suites passed. Fixtures cover multiple headers/main/subcategories, secondary category assignments, repeated ancestors, multi-value specifications, dynamic alternative counts, hidden categories, zero results, pagination and typo correction.
- Production build, lint (warnings only) and git diff --check passed.

Tests used disposable local databases and mocked browser APIs; production data was not changed.
