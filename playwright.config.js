// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/integration',
  testMatch: /.*\.spec\.js$/,

  /* Retry flaky tests on CI to reduce false negatives */
  retries: process.env.CI ? 2 : 0,

  /* Serialise on CI (single-core runners); use default parallelism locally */
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // Automatically starts json-server before the E2E suite and shuts it down after.
  // json-server serves both the REST API (/users) and static files (test-page.html)
  // from the project root via the --static flag.
  webServer: {
    command: 'npm run serve:test',
    url: 'http://localhost:3000/users',
    reuseExistingServer: true,
    timeout: 30000,
  },

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
