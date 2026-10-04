# Vinexus test suite

The repository has three complementary test layers:

- `npm run test:unit` runs Jest unit tests for session expiry, browser token storage, dealer registration validation, and the complete frontend route/section inventory.
- `npm run test:api` runs Supertest/Jest API behavior tests and automatically discovers and exercises every Express route mounted under `backend/src/routes/index.js`.
- `npm run test:e2e` runs Playwright against the Vite storefront. Every route declared in `AppRoutes.jsx` gets a browser smoke test, with extra flows for remembered customer login and the complete dealer registration form.
- `npm run test:all` runs all three layers.

## First-time browser setup

After `npm install` in the repository root, install Playwright's Chromium binary once:

```sh
npx playwright install chromium
```

To use an already installed Chrome instead, run with `PLAYWRIGHT_CHANNEL=chrome`.

## Coverage guarantees

The API and browser inventories are parsed from the application's actual route source files. Adding a new route therefore automatically adds it to the contract/smoke matrix. The unit test also fails if a browser route cannot be converted to a concrete test URL or if one of the major website sections disappears.

Browser API calls are intercepted with deterministic fixtures, so E2E coverage does not modify the development or production database. API contract tests disable Mongoose command buffering and use invalid/anonymous input; they verify routing, authentication, and validation without deleting or creating records.
