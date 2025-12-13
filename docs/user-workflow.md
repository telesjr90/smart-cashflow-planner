# Cashflow App – End-to-End User Workflow

This describes how a new user moves through the app using the existing features: initial sign-in, income and pay schedule setup, accounts, bills, goals, expenses/transactions, plan lock-in, and viewing projected vs actual cash flow plus discretionary spend.

## 1) First access / onboarding
- The user lands on the Home tab (`home`). If not signed in, Google sign-in is prompted (handled in `App` auth flow).
- After sign-in, Home shows high-level balances, upcoming bills, and the FAB to add transactions.
- The BottomNav (home, planner, bills, settings; plus FAB) provides primary navigation.

## 2) Set up income and pay schedule
- Navigate to **Settings** (BottomNav tab `settings`).
- In the **Pay Schedule / Income** section (Settings → IncomeForm):
  - Edit income fields (husband/wife amounts).
  - Set pay schedule (e.g., semi-monthly dates).
  - Save via “Save” (calls `handleUpdateIncomeAndPaySchedule` in Settings/App, persists to store).

## 3) Add accounts
- In **Settings → Accounts** (AccountsForm):
  - Add an account (name/type/opening balance).
  - Set a residual account.
  - Save accounts (`handleUpdateAccounts` persists).
  - Destructive delete shows ConfirmModal; success/error toasts fire.

## 4) Add budgets (optional but recommended)
- In **Settings → Budgets**:
  - Add/edit/delete budget categories and amounts.
  - Save via “Save budgets” to persist to store.
  - These categories feed bill/goal categorization and uncategorized fallbacks.

## 5) Add bills
- Go to the **Bills** tab (`bills`).
- Add a bill via the sheet:
  - Enter name, amount (>0), due day, payer, category (or uncategorized), withdraw-from account.
  - Validation errors surface via toasts; success toast on save.
  - Bills can be marked paid/unpaid per month and bulk-marked; account can be changed inline.
  - Delete uses ConfirmModal with danger styling; toasts on success/error.

## 6) Add goals
- In **Settings → Goals**:
  - “+ Add goal” creates a fully initialized goal (id, name, targetAmount, perMonth, scope/owner, account, contributions, dates).
  - Inline validation: name required; targetAmount > 0.
  - Edit scope (personal/shared), owner, contributions, dates; save goals to persist.

## 7) Add allocation rules (optional)
- In **Settings → Allocation Rules**:
  - Add/edit rules (account, type percent/amount, frequency, label).
  - Delete via ConfirmModal; toasts on success/error.
  - Save rules to persist planned allocations.

## 8) Add expenses/transactions (actuals)
- From **Home** FAB or **Expenses** tab (if exposed):
  - Open AddTransactionModal:
    - Set type (expense/income), amount, category, date (DateInput), description, and account chips.
    - Save to store (`updateExpenses`), closing the modal.
- In **Expenses** page:
  - Edit existing transactions via sheet; delete via ConfirmModal with success/error toasts.

## 9) View projected vs actual cash flows
- **Planner** tab (`planner`):
  - Shows projected balance chart (months, ledger projection from income/pay schedule, bills, goals).
  - Infographic (MonthlyCashFlowInfographic) displays projected vs actual views using live store data (bills, expenses/transactions, accounts, goals, allocations).
  - Runway, lowest/peak balances, and status badges are visible.

## 10) Track discretionary spending
- Actual expenses (transactions) stored via `expenses/transactions` feed into:
  - Infographic actual view for cashflow vs planned.
  - Category budgets and paid status (via bills/expenses mapping), allowing discretionary assessment (confirmedDiscretionary persisted in store).

## 11) Plan lock-in / persistence
- All saves call `handleUpdate*` functions which persist to the Zustand store with IndexedDB/localStorage fallback.
- Root ErrorBoundary and local boundaries guard crashes; ConfirmModal and toasts standardize destructive flows and feedback.

## 12) Ongoing usage
- Home: quick overview + upcoming bills + add transaction FAB.
.- Bills: month-by-month paid/unpaid, overdue flags, edit/delete.
- Expenses: manage actual transactions (if tab exposed) with delete confirmations.
- Planner: projected vs actual view with infographic.
- Settings: profile, accounts, allocations, goals, budgets, income/pay schedule, bill sharing.

### Hidden/legacy
- `src/pages/Accounts.jsx` exists but is not wired to navigation; can be removed or exposed if needed.
