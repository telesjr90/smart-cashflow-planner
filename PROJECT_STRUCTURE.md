cashflow-app
├── artifacts
│   └── audit
│       ├── actions.json
│       ├── console.json
├── docs
│   ├── feature-review-notes.md
│   └── production-readiness.md
├── playwright-report
│   └── index.html
├── public
│   ├── templates
│   │   └── onboarding-import-template.csv
│   ├── about.txt
│   ├── favicon.ico
│   ├── manifest.json
│   ├── manifest.webmanifest
│   ├── site.webmanifest
│   └── vite.svg
├── scripts
│   ├── audit-headless.spec.js-snapshots
│   ├── adminClient.js
│   ├── audit-headless.spec.js
│   ├── markBillsPaidUpTo2025-11-14.js
│   └── testCashflowEngine.mjs
├── src
│   ├── assets
│   │   ├── icons
│   │   │   └── react.svg
│   │   └── images
│   ├── components
│   │   ├── bills
│   │   │   └── BillFormSheet.jsx
│   │   ├── charts
│   │   │   └── CashflowChart.jsx
│   │   ├── expenses
│   │   │   └── ExpenseFormSheet.jsx
│   │   ├── layout
│   │   │   ├── AppShell.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── TopBar.jsx
│   │   ├── settings
│   │   │   ├── AccountsForm.jsx
│   │   │   ├── AllocationRulesForm.jsx
│   │   │   ├── BalancesSummaryCard.jsx
│   │   │   ├── BillSharingForm.jsx
│   │   │   ├── BudgetsForm.jsx
│   │   │   ├── GoalsForm.jsx
│   │   │   ├── IncomeScheduleForm.jsx
│   │   │   ├── ProfileForm.jsx
│   │   │   └── StartingBalanceCard.jsx
│   │   ├── ui
│   │   │   ├── modals
│   │   │   │   └── ConfirmModal.jsx
│   │   │   ├── skeleton
│   │   │   │   └── DashboardSkeleton.jsx
│   │   │   ├── toast
│   │   │   │   ├── ToastProvider.jsx
│   │   │   │   └── useToast.js
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── LoadingOverlay.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── TransactionRow.jsx
│   │   ├── AddExpenseModal.jsx
│   │   ├── AddTransactionModal.jsx
│   │   ├── BulkImportSpreadsheet.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── TransactionRow.md
│   ├── hooks
│   │   ├── useCashflowData.js
│   │   ├── useCashflowSummary.js
│   │   ├── useCashflowTimeline.js
│   │   ├── useConfirm.jsx
│   │   ├── useFirebaseSync.js
│   │   ├── useNetworkStatus.js
│   │   ├── useTheme.js
│   │   └── useUpcomingBills.js
│   ├── lib
│   │   ├── cashflow
│   │   │   ├── calculateGoals.js
│   │   │   ├── dateUtils.js
│   │   │   ├── formatters.js
│   │   │   ├── index.js
│   │   │   ├── projectCashflow.js
│   │   │   └── recurring.js
│   │   ├── billSharing.js
│   │   ├── categories.js
│   │   └── safeLocalStorage.js
│   ├── pages
│   │   ├── Accounts.jsx
│   │   ├── Bills.jsx
│   │   ├── Expenses.jsx
│   │   ├── Home.jsx
│   │   ├── Planner.jsx
│   │   └── Settings.jsx
│   ├── store
│   │   ├── selectors
│   │   │   ├── billsSelectors.js
│   │   │   └── summarySelectors.js
│   │   ├── storage.js
│   │   ├── useCashflowStore.js
│   │   └── useStore.js
│   ├── utils
│   │   └── dateFormat.js
│   ├── App.css
│   ├── App.jsx
│   ├── MonthlyCashFlowInfographic.jsx
│   ├── index.css
│   └── main.jsx
├── tests
│   ├── e2e
│   │   ├── bills-flow.spec.js
│   │   ├── expenses-flow.spec.js
│   │   ├── persistence.spec.js
│   │   ├── planner-flow.spec.js
│   │   ├── settings-flow.spec.js
│   │   └── stability.spec.js
│   ├── firestore
│   │   └── securityRules.test.js
│   ├── integration
│   │   ├── accounts.integration.test.js
│   │   ├── settings.integration.test.js
│   │   └── transactions.integration.test.js
│   ├── unit
│   │   ├── cashflowLogic.test.mjs
│   │   ├── dateFormat.test.js
│   │   └── projectCashflow.test.js
│   ├── utils
│   │   ├── mockData.js
│   │   └── seedFirestore.js
│   ├── visual
│   │   ├── home.spec.js-snapshots
│   │   ├── infographic.spec.js-snapshots
│   │   ├── planner.spec.js-snapshots
│   │   ├── settings.spec.js-snapshots
│   │   ├── billSharing.test.mjs
│   │   ├── home.spec.js
│   │   ├── infographic.spec.js
│   │   ├── planner.spec.js
│   │   ├── remote.visual.spec.js
│   │   └── settings.spec.js
│   └── cashflowEnginge.test.mjs
├── README.md
├── eslint.config.js
├── firebase.json
├── firestore.rules
├── githubtoken.txt
├── index.html
├── lighthouse.config.js
├── package-lock.json
├── package.json
├── playwright.audit.config.js
├── playwright.config.js
├── playwright.remote.config.js
├── postcss.config.js
├── postcss.config.json
├── project_structure.md
├── seedBills.cjs
├── serviceAccountKey.json
├── structure.md
├── tailwind.config.js
├── tailwind.config.json
├── vite.config.js
└── vitest.config.js
