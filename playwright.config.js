// path: playwright.config.js
import { defineConfig, devices } from '@playwright/test';

// NOTE: Default target is STAGING (no demo modes).
// You can override with env vars:
//   PW_BASE_URL=http://localhost:5173          (local)
//   PW_STAGING_URL=https://...staging...       (staging)
//   PW_PROD_URL=https://...prod...             (prod)
const STAGING_URL = process.env.PW_STAGING_URL || 'https://cashflow-a1c11-staging.web.app';
const PROD_URL = process.env.PW_PROD_URL || 'https://cashflow-a1c11.web.app';
const BASE_URL = process.env.PW_BASE_URL || STAGING_URL;

const authDir = 'playwright/.auth';
const stagingStorageState = `${authDir}/staging.json`;
const prodStorageState = `${authDir}/prod.json`;

export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Only start a local dev server when targeting localhost. */
  webServer:
    BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')
      ? {
          command: 'npm run dev',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
        }
      : undefined,

  projects: [
    // --- STAGING ---
    {
      name: 'auth-staging',
      testMatch: /.*auth\.staging\.setup\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: STAGING_URL,
        // Use an installed browser channel to avoid Google "unsafe browser" blocks.
        channel: process.env.PW_BROWSER_CHANNEL || 'chrome',
        headless: false,
      },
    },
    {
      name: 'staging',
      testIgnore: /.*auth\.(staging|prod)\.setup\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: STAGING_URL,
        // REMOVED storageState to rely on pure E2E anonymous bypass via ?e2e=1
        // storageState: stagingStorageState, 
      },
    },

    // --- PROD ---
    {
      name: 'auth-prod',
      testMatch: /.*auth\.prod\.setup\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PROD_URL,
        channel: process.env.PW_BROWSER_CHANNEL || 'chrome',
        headless: false,
      },
    },
    {
      name: 'prod',
      testIgnore: /.*auth\.(staging|prod)\.setup\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PROD_URL,
        storageState: prodStorageState,
      },
    },

    // --- Local dev / generic Chromium project ---
    // Keep this for fast local iteration (optionally with PW_BASE_URL=http://localhost:5173).
    {
      name: 'chromium',
      testIgnore: /.*auth\.(staging|prod)\.setup\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});