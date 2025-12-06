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
│   ├── 📄 manifest.json                # PWA manifest (JSON)
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
│   ├── 📁 assets/                      # Static assets (images, icons, design mockups)
│   │   ├── 📄 react.svg                # React logo
│   │   │
│   │   └── 📁 New folder/              # UI/UX design mockups (128 PNG files)
│   │       ├── 📄 1. Launch.png
│   │       ├── 📄 1 - A - Launch.png
│   │       ├── 📄 1 - B - Launch.png
│   │       ├── 📄 2. On Boarding.png
│   │       ├── 📄 2 - A - On Boarding.png
│   │       ├── 📄 2 - B - On Boarding.png
│   │       ├── 📄 3. Login\...
│   │       ├── 📄 3.0 - Log In.png
│   │       ├── 📄 3.0 - A - Login.png
│   │       ├── 📄 3.0 - A - Create Account.png
│   │       ├── 📄 3.1 - A - Login.png
│   │       ├── 📄 3.1 - Forgot & Reset Password.png
│   │       ├── 📄 3.2 - Security Pin.png
│   │       ├── 📄 3.2 - A - Security Pin.png
│   │       ├── 📄 3.2 - B -  New Password.png
│   │       ├── 📄 3.2 - C -  New Password.png
│   │       ├── 📄 3.3 - Security Fingerprint.png
│   │       ├── 📄 3.3 - A - Security Fingerprint.png
│   │       ├── 📄 4. Home.png
│   │       ├── 📄 4- A - Home.png
│   │       ├── 📄 5. Floating Menu.png
│   │       ├── 📄 5.1. Notification.png
│   │       ├── 📄 5.1 - A - Notification.png
│   │       ├── 📄 6. Account Balance.png
│   │       ├── 📄 6 - A - Account Balance.png
│   │       ├── 📄 7. Quickly Analysis.png
│   │       ├── 📄 7 - A - Quickly Analysis.png
│   │       ├── 📄 8. Transaction.png
│   │       ├── 📄 8 - A - Transaction.png
│   │       ├── 📄 9 Bottom Navigation.png
│   │       ├── 📄 9 - A - Home - Bottom Navigation.png
│   │       ├── 📄 9.1 Home.png
│   │       ├── 📄 9.2. Analysis.png
│   │       ├── 📄 9.2.1 Daily.png
│   │       ├── 📄 9.2.1 - A - Daily.png
│   │       ├── 📄 9.2.1 - A - VisualDaily.png
│   │       ├── 📄 9.2.2 Weekly.png
│   │       ├── 📄 9.2.2 - A - Weekly.png
│   │       ├── 📄 9.2.3 Monthly.png
│   │       ├── 📄 9.2.3 - A - Monthly.png
│   │       ├── 📄 9.2.4 Yearly.png
│   │       ├── 📄 9.2.4 - A - Yearly.png
│   │       ├── 📄 9.2.5 Search.png
│   │       ├── 📄 9.2.5 - A - Search.png
│   │       ├── 📄 9.2.5 - B - Search.png
│   │       ├── 📄 9.26 Calender.png
│   │       ├── 📄 9.2.6 - A - Calender.png
│   │       ├── 📄 9.2.6 - B - Calender.png
│   │       ├── 📄 9.3 Transactions.png
│   │       ├── 📄 9.3.0 Transactions.png
│   │       ├── 📄 9.3.0 - A - Transaction.png
│   │       ├── 📄 9.3.1 Income.png
│   │       ├── 📄 9.3.1 - B - Transaction\...
│   │       ├── 📄 9.3.2 Expense.png
│   │       ├── 📄 9.3.2- C - Transaction\...
│   │       ├── 📄 9.4 Categories.png
│   │       ├── 📄 9.4.0 Categories.png
│   │       ├── 📄 9.4.0 - A - Categories.png
│   │       ├── 📄 9.4.1 Food.png
│   │       ├── 📄 9.4.1 - A - Food.png
│   │       ├── 📄 9.4.1 - B - Food\...
│   │       ├── 📄 9.4.2 Transport.png
│   │       ├── 📄 9.4.2 - A - Transport.png
│   │       ├── 📄 9.4.2 - B - Transport\...
│   │       ├── 📄 9.4.3 Groceries.png
│   │       ├── 📄 9.4.3 - A - Groceries.png
│   │       ├── 📄 9.4.3 - B - Groceries\...
│   │       ├── 📄 9.4.4 Rent.png
│   │       ├── 📄 9.4.4 - A - Rent.png
│   │       ├── 📄 9.4.4 - B -Rent\...
│   │       ├── 📄 9.4.5 Gifts.png
│   │       ├── 📄 9.4.5 - A - Gifts.png
│   │       ├── 📄 9.4.5 - B - Gist\...
│   │       ├── 📄 9.4.6 Medicine.png
│   │       ├── 📄 9.4.6 - A - Medicine.png
│   │       ├── 📄 9.4.6 - B - Medicine.png
│   │       ├── 📄 9.4.7 Entertainment.png
│   │       ├── 📄 9.4.7 - A - Entertainment.png
│   │       ├── 📄 9.4.7 - B - Entertainment.png
│   │       ├── 📄 9.4.8 Saving.png
│   │       ├── 📄 9.4.8 - A - Savings.png
│   │       ├── 📄 9.4.8 - B - Travel.png
│   │       ├── 📄 9.4.8 - C - Travel\...
│   │       ├── 📄 9.4.8 - D -  New House.png
│   │       ├── 📄 9.4.8 - E -  New HouseAdd Expenses.png
│   │       ├── 📄 9.4.8 - F - Car.png
│   │       ├── 📄 9.4.8 - G - Car Expense.png
│   │       ├── 📄 9.4.8 - H - Wedding.png
│   │       ├── 📄 9.4.8 - I - Wedding Expense.png
│   │       ├── 📄 9.4.8 Saving-1.png
│   │       ├── 📄 9.4.9 - A - New Categories.png
│   │       ├── 📄 9.4.9 - B - New Categories.png
│   │       ├── 📄 9.5 Profile.png
│   │       ├── 📄 9.5.0 Profile.png
│   │       ├── 📄 9.5.0 - A - Profile.png
│   │       ├── 📄 9.5.1 Edit Profile.png
│   │       ├── 📄 9.5.1 - A - Edit Profile.png
│   │       ├── 📄 9.5.2 Security.png
│   │       ├── 📄 9.5.2 - A -  Security.png
│   │       ├── 📄 9.5.2 - B - Change Pin.png
│   │       ├── 📄 9.5.2 - C - Change Pin.png
│   │       ├── 📄 9.5.2 - D -Fingerprint.png
│   │       ├── 📄 9.5.2 - E- Fingerprint.png
│   │       ├── 📄 9.5.2 - F - Fingerprint.png
│   │       ├── 📄 9.5.2 - G - Fingerprint.png
│   │       ├── 📄 9.5.2 - G - Fingerprint Eliminate.png
│   │       ├── 📄 9.5.2 - H -  Terms And Conditions.png
│   │       ├── 📄 9.5.3 Setting.png
│   │       ├── 📄 9.5.3 - A - Settings.png
│   │       ├── 📄 9.5.3 - B - Notification Settings.png
│   │       ├── 📄 9.5.3 - C - Password Settings.png
│   │       ├── 📄 9.5.3 - D - Password Settings.png
│   │       ├── 📄 9.5.3 - E - Delete Account.png
│   │       ├── 📄 9.5.3 - F - Delete Account.png
│   │       ├── 📄 9.5.4 Help.png
│   │       ├── 📄 9.5.4.1 Help Center.png
│   │       ├── 📄 9.5.4.1 - A - Help Center.png
│   │       ├── 📄 9.5.4.1 - B -  Help Center.png
│   │       ├── 📄 9.5.4.2 Online Support.png
│   │       ├── 📄 9.5.4.2 - A -  Online Support.png
│   │       ├── 📄 9.5.4.2 - B -  Online Support.png
│   │       ├── 📄 9.5.5 Log Out.png
│   │       ├── 📄 9.5.5 - A - Log Out.png
│   │       ├── 📄 9.5.5 - B - Log Out.png
│   │       ├── 📄 Delete account.png
│   │       ├── 📄 End session.png
│   │       ├── 📄 New Category.png
│   │       └── 📄 Finance Management Mobile App UI UX Kit for Budget Tracker Financial Prototype Design (Community) (Copy).png
│   │
│   ├── 📁 components/                  # Reusable UI components
│   │   ├── 📄 AddExpenseModal.jsx      # Modal for adding expenses
│   │   ├── 📄 BulkImportSpreadsheet.jsx  # Bulk import functionality
│   │   ├── 📄 ErrorBoundary.jsx        # Error handling component
│   │   │
│   │   ├── 📁 layout/                  # Layout components
│   │   │   └── 📄 AppShell.jsx         # Main app shell/layout wrapper
│   │   │
│   │   ├── 📁 settings/                # Settings-related components
│   │   │   ├── 📄 AccountsForm.jsx     # Account management form
│   │   │   ├── 📄 AllocationRulesForm.jsx  # Allocation rules form
│   │   │   ├── 📄 BalancesSummaryCard.jsx  # Balance summary display
│   │   │   ├── 📄 BillSharingForm.jsx  # Bill sharing configuration
│   │   │   ├── 📄 BudgetsForm.jsx      # Budget configuration form
│   │   │   ├── 📄 GoalsForm.jsx       # Financial goals form
│   │   │   ├── 📄 IncomeScheduleForm.jsx  # Income schedule form
│   │   │   ├── 📄 ProfileForm.jsx     # User profile form
│   │   │   └── 📄 StartingBalanceCard.jsx  # Starting balance display
│   │   │
│   │   └── 📁 ui/                      # Base UI components
│   │       ├── 📄 Badge.jsx            # Badge component
│   │       ├── 📄 Button.jsx           # Button component
│   │       ├── 📄 Card.jsx             # Card component
│   │       ├── 📄 Input.jsx            # Input component
│   │       ├── 📄 StatCard.jsx         # Statistics card component
│   │       └── 📄 ThemeToggle.jsx      # Theme toggle component
│   │
│   ├── 📁 pages/                       # Page components (routes)
│   │   ├── 📄 Accounts.jsx             # Account management page
│   │   ├── 📄 Bills.jsx                # Bills management page
│   │   ├── 📄 Expenses.jsx             # Expenses tracking page
│   │   ├── 📄 Home.jsx                 # Dashboard/home page
│   │   ├── 📄 Planner.jsx              # Financial planning page
│   │   └── 📄 Settings.jsx             # Application settings page
│   │
│   ├── 📁 hooks/                       # Custom React hooks
│   │   ├── 📄 useCashflowData.js       # Cashflow data management hook
│   │   ├── 📄 useCashflowSummary.js    # Cashflow summary calculations hook
│   │   ├── 📄 useFirebaseSync.js       # Firebase synchronization hook
│   │   └── 📄 useTheme.js              # Theme management hook
│   │
│   ├── 📁 lib/                         # Utility libraries and business logic
│   │   ├── 📄 billSharing.js           # Bill sharing functionality
│   │   ├── 📄 safeLocalStorage.js      # Safe localStorage wrapper
│   │   │
│   │   └── 📁 cashflow/                # Cashflow calculation engine
│   │       ├── 📄 index.js             # Cashflow module exports
│   │       ├── 📄 dateUtils.js         # Date utility functions
│   │       ├── 📄 formatters.js        # Data formatting utilities
│   │       └── 📄 projectCashflow.js   # Core cashflow projection logic
│   │
│   └── 📁 store/                       # State management (Zustand)
│       └── 📄 useCashflowStore.js      # Cashflow state store
│
├── 📁 scripts/                         # Utility scripts
│   ├── 📄 markBillsPaidUpTo2025-11-14.js  # Script to mark bills as paid
│   └── 📄 testCashflowEngine.mjs      # Cashflow engine testing script
│
├── 📁 tests/                           # Test files
│   ├── 📄 cashflowEnginge.test.mjs     # Cashflow engine unit tests
│   │
│   ├── 📁 utils/                       # Test utilities and helpers
│   │   ├── 📄 mockData.js              # Mock data for testing
│   │   └── 📄 seedFirestore.js         # Firestore seeding utility
│   │
│   └── 📁 visual/                      # Visual regression tests (Playwright)
│       ├── 📄 home.spec.js             # Home page visual tests
│       ├── 📄 infographic.spec.js      # Infographic visual tests
│       ├── 📄 planner.spec.js          # Planner page visual tests
│       ├── 📄 settings.spec.js         # Settings page visual tests
│       │
│       └── 📁 home.spec.js-snapshots/  # Home page snapshots
│           ├── 📄 add-expense-modal-chromium-win32.png
│           └── 📄 home-page-chromium-win32.png
│       │
│       ├── 📁 infographic.spec.js-snapshots/  # Infographic snapshots
│           └── 📄 infographic-chromium-win32.png
│       │
│       ├── 📁 planner.spec.js-snapshots/  # Planner snapshots
│           └── 📄 planner-view-chromium-win32.png
│       │
│       └── 📁 settings.spec.js-snapshots/  # Settings snapshots
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

### `/src/assets`
Static assets including images, icons, and UI/UX design mockups:
- **react.svg** - React logo icon
- **New folder/** - Contains 128 PNG design mockup files for a finance management mobile app UI/UX kit, including:
  - Launch and onboarding screens
  - Authentication flows (login, signup, password reset, security pin, fingerprint)
  - Home dashboard screens
  - Navigation components
  - Analysis screens (daily, weekly, monthly, yearly views)
  - Transaction management screens
  - Category management (Food, Transport, Groceries, Rent, Gifts, Medicine, Entertainment, Savings, Travel, etc.)
  - Profile and settings screens
  - Help and support screens

### `/src/pages`
Page-level components that correspond to different routes in the application:
- **Home.jsx** - Dashboard/home page
- **Bills.jsx** - Bills management page
- **Expenses.jsx** - Expenses tracking page
- **Accounts.jsx** - Account management page
- **Planner.jsx** - Financial planning page
- **Settings.jsx** - Application settings page

### `/src/components`
Reusable UI components organized by category:
- **Root components**: AddExpenseModal, BulkImportSpreadsheet, ErrorBoundary
- **layout/** - Layout components (AppShell)
- **settings/** - Settings form components (AccountsForm, BudgetsForm, etc.)
- **ui/** - Base UI components (Button, Card, Input, Badge, StatCard, ThemeToggle)

### `/src/hooks`
Custom React hooks for shared logic:
- **useCashflowData.js** - Manages cashflow data fetching and state
- **useCashflowSummary.js** - Calculates cashflow summaries
- **useFirebaseSync.js** - Handles Firebase synchronization
- **useTheme.js** - Manages theme (light/dark mode)

### `/src/store`
State management using Zustand:
- **useCashflowStore.js** - Global cashflow state store

### `/src/lib`
Core business logic and utility libraries:
- **billSharing.js** - Bill sharing functionality
- **safeLocalStorage.js** - Safe localStorage wrapper with error handling
- **cashflow/** - Cashflow calculation engine module
  - **index.js** - Module exports
  - **dateUtils.js** - Date utility functions
  - **formatters.js** - Data formatting utilities
  - **projectCashflow.js** - Core cashflow projection logic

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

## Technology Stack

- **Frontend Framework**: React 18.3.1 with Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **Testing**: Playwright (visual regression), Jest (unit tests)
- **PWA**: Vite PWA plugin with Workbox
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Notes

- The `dist/` folder is generated during build and should not be committed to version control
- The `node_modules/` folder contains dependencies and should not be committed
- The `test-results/` folder contains test execution artifacts and should not be committed
- Service account keys and tokens should be kept secure and not committed to version control
- Configuration files exist in both JS and JSON formats (tailwind.config.js/json, postcss.config.js/json)
