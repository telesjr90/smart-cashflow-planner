import { defineConfig } from '@playwright/test';

// Dedicated config for visual regression specs.
export default defineConfig({
  testDir: './tests/visual',
  // Limit matches to Playwright specs to avoid picking up *.test.mjs (Vitest) files.
  testMatch: '**/*.spec.{js,ts}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 }, // Consistent viewport for snapshots
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
