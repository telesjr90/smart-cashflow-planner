/**
 * Lighthouse CI config focused on Core Web Vitals and PWA basics.
 * Run with: npx lhci autorun --config=./lighthouse.config.js
 */
module.exports = {
    ci: {
      collect: {
        numberOfRuns: 3,
        startServerCommand: "npm run preview",
        url: [
          "http://localhost:4173/",
          "http://localhost:4173/?agentDemo=1",
        ],
        settings: {
          preset: "desktop",
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 2,
          },
          formFactor: "desktop",
          screenEmulation: { mobile: false, width: 1366, height: 768, deviceScaleFactor: 1, disabled: false },
        },
      },
      assert: {
        assertions: {
          "categories:performance": ["warn", { minScore: 0.9 }],
          "categories:accessibility": ["warn", { minScore: 0.9 }],
          "categories:best-practices": ["warn", { minScore: 0.9 }],
          "categories:pwa": ["warn", { minScore: 0.7 }],
          "unused-javascript": "warn",
          "uses-responsive-images": "warn",
          "uses-text-compression": "warn",
        },
      },
      upload: {
        target: "filesystem",
        outputDir: "./.lighthouse",
        reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%.html",
      },
    },
  };
  