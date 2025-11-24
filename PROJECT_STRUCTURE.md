# Cashflow App - Project Structure

```
cashflow-app/
│
├── 📁 public/                          # Static assets served directly
│   ├── 📄 about.txt
│   ├── 📄 apple-touch-icon.png
│   ├── 📄 favicon-16x16.png
│   ├── 📄 favicon-32x32.png
│   ├── 📄 favicon.ico
│   ├── 📄 manifest.webmanifest         # PWA manifest
│   ├── 📄 pwa-192.png                  # PWA icon (192x192)
│   ├── 📄 pwa-512.png                  # PWA icon (512x512)
│   ├── 📄 site.webmanifest
│   ├── 📄 vite.svg
│   └── 📁 templates/
│       └── 📄 onboarding-import-template.csv
│
├── 📁 src/                             # Source code
│   ├── 📄 App.jsx                      # Main application component
│   ├── 📄 App.css                      # Application styles
│   ├── 📄 main.jsx                     # Application entry point
│   ├── 📄 index.css                    # Global styles
│   ├── 📄 firebase.js                  # Firebase configuration
│   ├── 📄 firebaseeee1.md              # Firebase documentation/notes
│   ├── 📄 MonthlyCashFlowInfographic.jsx  # Cashflow visualization component
│   │
│   ├── 📁 assets/                      # Static assets (images, icons)
│   │   └── 📄 react.svg
│   │
│   ├── 📁 components/                  # Reusable UI components
│   │   ├── 📄 AddExpenseModal.jsx
│   │   ├── 📄 BulkImportSpreadsheet.jsx
│   │   └── 📄 ErrorBoundary.jsx
│   │
│   ├── 📁 pages/                       # Page components (routes)
│   │   ├── 📄 Accounts.jsx
│   │   ├── 📄 Bills.jsx
│   │   ├── 📄 Expenses.jsx
│   │   ├── 📄 Home.jsx
│   │   ├── 📄 Planner.jsx
│   │   └── 📄 Settings.jsx
│   │
│   └── 📁 lib/                         # Utility libraries and business logic
│       ├── 📄 billSharing.js           # Bill sharing functionality
│       └── 📄 cashflowEngine.js        # Core cashflow calculation engine
│
├── 📁 scripts/                         # Utility scripts
│   ├── 📄 markBillsPaidUpTo2025-11-14.js
│   └── 📄 testCashflowEngine.mjs
│
├── 📁 tests/                           # Test files
│   ├── 📁 utils/                       # Test utilities and helpers
│   │   ├── 📄 mockData.js
│   │   └── 📄 seedFirestore.js
│   │
│   └── 📁 visual/                      # Visual regression tests
│       ├── 📄 home.spec.js
│       ├── 📄 infographic.spec.js
│       ├── 📄 planner.spec.js
│       ├── 📄 settings.spec.js
│       │
│       └── 📁 home.spec.js-snapshots/
│           ├── 📄 add-expense-modal-chromium-win32.png
│           └── 📄 home-page-chromium-win32.png
│       │
│       ├── 📁 infographic.spec.js-snapshots/
│           └── 📄 infographic-chromium-win32.png
│       │
│       ├── 📁 planner.spec.js-snapshots/
│           └── 📄 planner-view-chromium-win32.png
│       │
│       └── 📁 settings.spec.js-snapshots/
│           └── 📄 settings-page-chromium-win32.png
│
├── 📁 dist/                            # Build output (generated)
│   ├── 📄 index.html
│   ├── 📄 about.txt
│   ├── 📄 apple-touch-icon.png
│   ├── 📄 favicon-16x16.png
│   ├── 📄 favicon-32x32.png
│   ├── 📄 favicon.ico
│   ├── 📄 manifest.webmanifest
│   ├── 📄 pwa-192.png
│   ├── 📄 pwa-512.png
│   ├── 📄 registerSW.js
│   ├── 📄 site.webmanifest
│   ├── 📄 sw.js                        # Service worker
│   ├── 📄 sw.js.map
│   ├── 📄 vite.svg
│   ├── 📄 workbox-5ffe50d4.js          # Workbox PWA library
│   ├── 📄 workbox-5ffe50d4.js.map
│   │
│   ├── 📁 assets/                      # Bundled assets
│   │   ├── 📄 index-*.js               # JavaScript bundles
│   │   ├── 📄 index-*.js.map           # Source maps
│   │   └── 📄 index-*.css              # CSS bundles
│   │
│   └── 📁 templates/
│       └── 📄 onboarding-import-template.csv
│
├── 📁 test-results/                    # Test execution results (generated)
│   └── 📁 visual-settings-Settings-V-bfc15-ould-render-settings-layout-chromium/
│       └── 📄 settings-page-actual.png
│
├── 📁 node_modules/                    # Dependencies (generated)
│
├── 📄 package.json                     # Project dependencies and scripts
├── 📄 package-lock.json                # Locked dependency versions
├── 📄 vite.config.js                   # Vite build configuration
├── 📄 tailwind.config.js               # Tailwind CSS configuration
├── 📄 tailwind.config.json             # Tailwind CSS configuration (JSON)
├── 📄 postcss.config.js                # PostCSS configuration
├── 📄 postcss.config.json              # PostCSS configuration (JSON)
├── 📄 eslint.config.js                 # ESLint configuration
├── 📄 playwright.config.js             # Playwright test configuration
├── 📄 firebase.json                    # Firebase configuration
├── 📄 firestore.rules                  # Firestore security rules
├── 📄 index.html                       # HTML entry point
├── 📄 README.md                        # Project documentation
│
├── 📄 seedBills.cjs                    # Seed script for bills data
├── 📄 serviceAccountKey.json           # Firebase service account key
├── 📄 cashflow-a1c11-firebase-adminsdk-fbsvc-3cd1083b6b.json  # Firebase admin SDK key
└── 📄 githubtoken.txt                  # GitHub token (should be in .gitignore)
```

## Directory Descriptions

### `/src`
Main source code directory containing all application logic, components, and utilities.

### `/src/pages`
Page-level components that correspond to different routes in the application:
- **Home.jsx** - Dashboard/home page
- **Bills.jsx** - Bills management page
- **Expenses.jsx** - Expenses tracking page
- **Accounts.jsx** - Account management page
- **Planner.jsx** - Financial planning page
- **Settings.jsx** - Application settings page

### `/src/components`
Reusable UI components used across multiple pages:
- **AddExpenseModal.jsx** - Modal for adding expenses
- **BulkImportSpreadsheet.jsx** - Bulk import functionality
- **ErrorBoundary.jsx** - Error handling component

### `/src/lib`
Core business logic and utility libraries:
- **cashflowEngine.js** - Main cashflow calculation engine
- **billSharing.js** - Bill sharing functionality

### `/public`
Static assets that are served directly without processing:
- PWA icons and manifests
- Favicons
- Templates for data import

### `/scripts`
Utility scripts for data seeding and testing:
- **seedBills.cjs** - Seed bills data
- **testCashflowEngine.mjs** - Test cashflow engine
- **markBillsPaidUpTo2025-11-14.js** - Utility script

### `/tests`
Test files organized by type:
- **utils/** - Test utilities and mock data
- **visual/** - Visual regression tests with Playwright

### `/dist`
Build output directory (generated by Vite). Contains optimized production assets.

## Key Configuration Files

- **vite.config.js** - Vite bundler configuration
- **tailwind.config.js** - Tailwind CSS styling configuration
- **firebase.json** - Firebase deployment and hosting configuration
- **firestore.rules** - Firestore database security rules
- **playwright.config.js** - Playwright testing configuration
- **eslint.config.js** - Code linting rules

## Notes

- The `dist/` folder is generated during build and should not be committed to version control
- The `node_modules/` folder contains dependencies and should not be committed
- Service account keys and tokens should be kept secure and not committed to version control
