// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/integration',
  testMatch: /.*\.spec\.js$/,

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
    headless: true,
    baseURL: 'http://localhost:3000',
  },
});
