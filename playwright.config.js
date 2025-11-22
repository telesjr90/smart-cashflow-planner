// playwright.config.js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixels: 120,   // tiny threshold
    },
  },
  use: {
    headless: true,
    viewport: { width: 1500, height: 1100 },
    ignoreHTTPSErrors: true,
    video: "off",
    screenshot: "only-on-failure",
    baseURL: "http://localhost:5173", // Vite default
  },
  // 2. Add this 'projects' section
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // You can add others here if needed (firefox, webkit, etc.)
  ],
});
