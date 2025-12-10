import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "scripts",
  testMatch: "audit-headless.spec.js",
  reporter: [["list"]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 3000,
    navigationTimeout: 8000,
  },
});
