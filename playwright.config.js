import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Scope Playwright to E2E specs only to avoid importing Vitest/Jest globals.
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Matches your local Vite port
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Mobile-first viewport (iPhone 12/13/14 range)
    viewport: { width: 390, height: 844 },
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }, // Viewport overrides this via 'use' above
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
