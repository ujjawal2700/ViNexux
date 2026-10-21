import { defineConfig, devices } from '@playwright/test';

const productionPreview = process.env.PLAYWRIGHT_PREVIEW === '1';
const port = productionPreview ? 4174 : 4173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: productionPreview ? 'test-results/production' : 'test-results/development',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: productionPreview ? 'playwright-report/production' : 'playwright-report/development', open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: `npm run ${productionPreview ? 'preview' : 'dev'} -- --host 127.0.0.1 --port ${port}`,
    cwd: './frontend',
    url: baseURL,
    reuseExistingServer: !productionPreview && !process.env.CI,
    timeout: 120_000,
  },
});
