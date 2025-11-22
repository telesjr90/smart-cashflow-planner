# Cashflow App - Project Structure

```
cashflow-app/
│
├── 📁 public/                          # Static assets served directly
│   ├── about.txt
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── manifest.webmanifest            # PWA manifest
│   ├── pwa-192.png                     # PWA icon 192x192
│   ├── pwa-512.png                     # PWA icon 512x512
│   ├── site.webmanifest
│   └── vite.svg
│
├── 📁 src/                             # Source code
│   ├── 📁 assets/                      # Static assets (images, etc.)
│   │   └── react.svg
│   │
│   ├── 📁 components/                  # Reusable React components
│   │   └── AddExpenseModal.jsx
│   │
│   ├── 📁 lib/                         # Utility libraries and business logic
│   │   ├── billSharing.js              # Bill sharing functionality
│   │   └── cashflowEngine.js           # Core cashflow calculation engine
│   │
│   ├── 📁 pages/                       # Page components (routes)
│   │   ├── Accounts.jsx                # Accounts management page
│   │   ├── Bills.jsx                   # Bills management page
│   │   ├── Home.jsx                    # Home/dashboard page
│   │   ├── Planner.jsx                 # Financial planner page
│   │   └── Settings.jsx                # Settings page
│   │
│   ├── App.css                         # Main application styles
│   ├── App.jsx                         # Root application component
│   ├── firebase.js                     # Firebase configuration and initialization
│   ├── firebaseeee1.md                 # Firebase documentation/notes
│   ├── index.css                       # Global styles
│   ├── main.jsx                        # Application entry point
│   └── MonthlyCashFlowInfographic.jsx  # Cashflow visualization component
│
├── 📁 tests/                           # Test files
│   ├── 📁 utils/                       # Test utilities and helpers
│   │   ├── mockData.js                 # Mock data for testing
│   │   └── seedFirestore.js            # Firestore seeding utilities
│   │
│   └── 📁 visual/                      # Visual regression tests (Playwright)
│       ├── 📁 home.spec.js-snapshots/  # Home page snapshots
│       │   ├── add-expense-modal-chromium-win32.png
│       │   └── home-page-chromium-win32.png
│       │
│       ├── 📁 infographic.spec.js-snapshots/  # Infographic snapshots
│       │   └── infographic-chromium-win32.png
│       │
│       ├── 📁 planner.spec.js-snapshots/  # Planner snapshots
│       │   └── planner-view-chromium-win32.png
│       │
│       ├── 📁 settings.spec.js-snapshots/  # Settings snapshots
│       │   └── settings-page-chromium-win32.png
│       │
│       ├── home.spec.js                # Home page visual tests
│       ├── infographic.spec.js         # Infographic visual tests
│       ├── planner.spec.js             # Planner visual tests
│       └── settings.spec.js            # Settings visual tests
│
├── 📁 scripts/                         # Utility scripts
│   ├── markBillsPaidUpTo2025-11-14.js  # Script to mark bills as paid
│   └── testCashflowEngine.mjs          # Cashflow engine test script
│
├── 📁 dist/                            # Build output (generated)
│   ├── 📁 assets/                      # Compiled assets
│   │   ├── index-*.css                 # Compiled CSS
│   │   ├── index-*.js                  # Compiled JavaScript
│   │   └── index-*.js.map              # Source maps
│   │
│   ├── about.txt
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── index.html                      # Built HTML
│   ├── manifest.webmanifest
│   ├── pwa-192.png
│   ├── pwa-512.png
│   ├── registerSW.js                   # Service worker registration
│   ├── site.webmanifest
│   ├── sw.js                           # Service worker
│   ├── sw.js.map                       # Service worker source map
│   ├── vite.svg
│   ├── workbox-*.js                    # Workbox PWA library
│   └── workbox-*.js.map
│
├── 📁 test-results/                    # Test execution results (generated)
│   └── visual-settings-Settings-V-bfc15-ould-render-settings-layout-chromium/
│       └── settings-page-actual.png
│
├── 📁 node_modules/                    # Dependencies (generated)
│
├── 📄 Configuration Files
│   ├── .gitignore                      # Git ignore rules
│   ├── eslint.config.js                # ESLint configuration
│   ├── firebase.json                   # Firebase configuration
│   ├── firestore.rules                 # Firestore security rules
│   ├── index.html                      # HTML template
│   ├── package.json                    # NPM dependencies and scripts
│   ├── package-lock.json               # Locked dependency versions
│   ├── playwright.config.js            # Playwright test configuration
│   ├── postcss.config.js               # PostCSS configuration
│   ├── postcss.config.json             # PostCSS JSON config
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── tailwind.config.json            # Tailwind CSS JSON config
│   └── vite.config.js                  # Vite build configuration
│
├── 📄 Firebase & Security
│   ├── cashflow-a1c11-firebase-adminsdk-fbsvc-3cd1083b6b.json  # Firebase Admin SDK key
│   └── serviceAccountKey.json          # Service account key
│
├── 📄 Data & Seeds
│   └── seedBills.cjs                   # Bill seeding script
│
└── 📄 Documentation
    └── README.md                        # Project documentation
```

## Key Directories

### `/src`
Main application source code:
- **`pages/`** - Route-level page components
- **`components/`** - Reusable UI components
- **`lib/`** - Business logic and utilities
- **`assets/`** - Static assets like images

### `/tests`
Test suite:
- **`visual/`** - Playwright visual regression tests
- **`utils/`** - Test helpers and mock data

### `/scripts`
Utility scripts for data management and testing

### `/public`
Static files served at the root URL

### `/dist`
Production build output (generated by Vite)

## Technology Stack

- **Frontend Framework**: React 18.2.0
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Testing**: Playwright (visual regression)
- **Backend**: Firebase (Firestore, Authentication)
- **PWA**: Service Worker with Workbox

## Build & Development

- Development server: `npm run dev`
- Production build: `npm run build`
- Tests: `npm test` or Playwright commands

