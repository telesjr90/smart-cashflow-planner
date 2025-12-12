import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/unit/**/*.{test,spec}.{js,mjs,jsx,ts,tsx}",
      "tests/integration/**/*.{test,spec}.{js,mjs,jsx,ts,tsx}",
      "tests/firestore/**/*.{test,spec}.{js,mjs,jsx,ts,tsx}",
      "tests/*.{test,spec}.{js,mjs,jsx,ts,tsx}",
    ],
    exclude: [
      "tests/e2e/**",
      "tests/visual/**",
    ],
  },
});
