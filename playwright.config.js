import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isCI = !!process.env.CI;

// Local default remains localhost; for prod runs, set PW_BASE_URL=https://cashflow-a1c11.web.app
const baseURL = process.env.PW_BASE_URL || 'http://localhost:5173';

// Auth state file used by the prod project
const prodStorageState = path.join(process.cwd(), 'playwright', '.auth', 'prod.json');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 },
    headless: true, // overridden in auth project below
  },

  projects: [
    // 1) Interactive auth setup for PROD (headed + real Chrome/Edge)
    {
      name: 'auth-prod',
      testMatch: /auth\.prod\.setup\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // IMPORTANT: use a real installed browser channel for Google sign-in
        // Try 'chrome' first. If your org blocks it, try 'msedge'.
        channel: process.env.PW_BROWSER_CHANNEL || 'chrome',
        headless: false,
        storageState: undefined, // create it
      },
    },

    // 2) PROD tests (reuse saved auth)
    {
      name: 'prod',
      testIgnore: /auth\.prod\.setup\.spec\.js/,
      dependencies: ['auth-prod'],
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PW_BROWSER_CHANNEL || 'chrome',
        storageState: prodStorageState,
      },
    },

    // 3) Local dev (your existing default)
    {
      name: 'chromium',
      testIgnore: /auth\.prod\.setup\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only start the local dev server when targeting localhost
  webServer: baseURL.includes('localhost')
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120000,
      }
    : undefined,
});
