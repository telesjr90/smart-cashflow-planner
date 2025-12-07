import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // We still keep the root as ./tests, but we'll target tests/e2e when running
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // 👇 This is the important part: hit the deployed app, not localhost
    baseURL: 'https://cashflow-a1c11.web.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 }, // mobile-ish (iPhone 12)
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // ❌ No webServer: we are not starting Vite here, just talking to Firebase hosting
});
