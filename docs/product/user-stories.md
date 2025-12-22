# User Stories

## Home
- **H1 – Home Snapshot** As a household member, I want to see a greeting and my balance on Home so that I immediately know my cash position.  
  - Acceptance Criteria: Given the store has hydrated with `accounts` or `startingBalance`, When I open `nav-home`, Then the “My Balance”/“Starting Balance” card renders within 10s and reflects the summed current/opening balances from `accounts` (preferring currentBalance/balance/cents).  
  - Primary UI location(s): `nav-home` (Home summary cards)  
  - Key data/state involved: `accounts`, `startingBalance`, `hasHydrated`, `userProfile.role`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.1), tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/stability.spec.js

- **H2 – Bills Due Indicator** As a user, I want “My Bills Due” to show only my unpaid share so that I know what I still owe this month.  
  - Acceptance Criteria: Given `bills` and `paidBills` for the current month, When I view Home, Then the Bills Due amount excludes any `paidBills` entries and hides bills whose `payer` does not match my `userProfile.role`, computing scoped amounts via `billSharing`.  
  - Primary UI location(s): `nav-home` (“My Bills Due” card)  
  - Key data/state involved: `bills`, `paidBills`, `billSharing`, `userProfile.role`  
  - Test coverage reference: tests/unit/homeBillsDueAmount.test.mjs

## Planner
- **P1 – Planner Landing** As a user, I want to open the Planner and see the Financial Analysis heading with a planned chart so that I know the forecast is available.  
  - Acceptance Criteria: Given plan data is hydrated, When I tap `nav-planner`, Then the “Financial Analysis” heading and Planned Balance chart render.  
  - Primary UI location(s): `nav-planner` (Planner top card)  
  - Key data/state involved: `startDate`, `accounts`, `bills`, `income`, `paySchedule`, `allocationRules`, `mode`  
  - Test coverage reference: tests/e2e/planner-flow.spec.js (D.1)

- **P2 – Planned vs Actual Toggle** As a user, I want to switch between Planned and Actual modes so that I can compare baseline vs realized spending.  
  - Acceptance Criteria: Given I am on Planner, When I tap the Planned/Actual buttons, Then both buttons are visible and selectable, and the infographic mode switches without errors.  
  - Primary UI location(s): `nav-planner` (Cashflow Infographic mode toggle)  
  - Key data/state involved: `mode`, `expenses`/`transactions`, `bills`, `income`, `paySchedule`  
  - Test coverage reference: tests/e2e/planner-flow.spec.js (D.2)

- **P3 – Actual Overlays Expenses** As a user, I want Actual mode to overlay my transactions while keeping the planned baseline intact so that I can see how spending affects the forecast.  
  - Acceptance Criteria: Given Planned and Actual end balances are recorded, When I add a transaction via `nav-add` and return to Planner, Then Planned end balance stays within tolerance of the prior value while Actual end balance decreases by the transaction amount (within ~$5).  
  - Primary UI location(s): `nav-planner` (Cashflow Infographic Planned/Actual tab)  
  - Key data/state involved: `expenses`/`transactions`, `mode`, `accounts`, `bills`, `income`, `paySchedule`, `residualAccountId`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.3, R.6)

- **P4 – Week Rows Stay Consistent** As a user, I want week summaries to present consistent start/end/net math so that I trust the breakdown.  
  - Acceptance Criteria: Given the Planner Week 1 row is visible, When I read its start, net, and end amounts, Then end ≈ start + net and at least one amount is non-zero.  
  - Primary UI location(s): `nav-planner` (Weekly table in Cashflow Infographic)  
  - Key data/state involved: `ledger` from projected cashflow, `expenses`, `bills`, `income`, `paySchedule`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.6)

## Bills
- **B1 – Add Bill** As a user, I want to add a recurring bill with amount and due day so that it appears in my schedule and impacts my plan.  
  - Acceptance Criteria: Given no bills exist or I tap “Add Bill”, When I fill name, amount, and due day and save, Then the bill is added to the month list with an assigned `accountId` (chosen or default `residualAccountId`) and appears on Home/Planner balances.  
  - Primary UI location(s): `nav-bills` (BillFormSheet, bills list)  
  - Key data/state involved: `bills`/`recurringBills`, `accounts`, `residualAccountId`, `paidBills`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.1), tests/e2e/stability.spec.js

- **B2 – Mark Bill Paid/Unpaid** As a user, I want to toggle a bill’s paid state so that my due totals reflect what remains.  
  - Acceptance Criteria: Given an unpaid bill is visible, When I tap its status icon, Then it changes to paid (green check) and the `paidBills` entry for that bill/month is updated; tapping again would remove the flag.  
  - Primary UI location(s): `nav-bills` (bill row toggle)  
  - Key data/state involved: `paidBills`, `bills`, `startDate`  
  - Test coverage reference: tests/e2e/bills-flow.spec.js (C.1)

## Expenses/Transactions
- **X1 – Add Transaction from FAB** As a user, I want to add a transaction from the Add button so that it is recorded and the modal closes.  
  - Acceptance Criteria: Given I’m on any tab with the add FAB visible, When I tap `nav-add`, enter amount and description, and save, Then the modal closes and a new transaction is appended to `expenses` with the chosen category/account.  
  - Primary UI location(s): `nav-add` modal (AddTransactionModal)  
  - Key data/state involved: `expenses`/`transactions`, `accounts`, `categoryBudgets` (for category options)  
  - Test coverage reference: tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/regression.spec.js (R.3)

- **X2 – View Transactions List** As a user, I want to see my saved transactions grouped by date so that I can review spending.  
  - Acceptance Criteria: Given at least one transaction exists, When I open `nav-expenses`, Then the list shows the transaction title/amount under its date header.  
  - Primary UI location(s): `nav-expenses` (Expenses page list)  
  - Key data/state involved: `expenses`/`transactions`, `accounts`, `categoryBudgets`  
  - Test coverage reference: tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/persistence.spec.js (F.2)

- **X3 – Edit or Delete Transaction** As a user, I want to edit or delete an existing transaction so that I can correct mistakes.  
  - Acceptance Criteria: Given a transaction row is visible, When I open it, change amount/category/account, and save, Then the row updates; When I delete, Then the row disappears from the list.  
  - Primary UI location(s): `nav-expenses` (Expenses list + ExpenseFormSheet)  
  - Key data/state involved: `expenses`/`transactions`, `accounts`  
  - Test coverage reference: tests/e2e/stability.spec.js

## Accounts
- **A1 – Add Account in Settings** As a user, I want to add an account with an opening balance so that my plan reflects new funds.  
  - Acceptance Criteria: Given I’m in Settings → Accounts, When I add an account name/type/balance and save, Then it is persisted in `accounts` with an optional `residualAccountId` selection, and Home/Planner balances increase accordingly.  
  - Primary UI location(s): `nav-settings` → “Accounts & Residual” section  
  - Key data/state involved: `accounts`, `residualAccountId`, `startingBalance` (fallback), `userProfile.role`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.1, R.6), tests/e2e/stability.spec.js

- **A2 – Accounts Listing** As a user, I want to view my accounts with formatted balances so that I can confirm totals.  
  - Acceptance Criteria: Given at least one account exists, When I open `nav-accounts`, Then I see the account name and currency-formatted balance for my role-accessible accounts.  
  - Primary UI location(s): `nav-accounts` (Accounts page cards)  
  - Key data/state involved: `accounts`, `userProfile.role`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.5)

## Budgets
- **BU1 – Create Budget Category** As a user, I want to add a budget category with a monthly limit so that transactions can be categorized against it.  
  - Acceptance Criteria: Given I’m in Settings → Budgets, When I add a category name and limit and save, Then the category is written to `categoryBudgets` and remains visible after navigation; it can be selected in transaction entry.  
  - Primary UI location(s): `nav-settings` → “Budgets” section  
  - Key data/state involved: `categoryBudgets`, `accounts` (optional links), `userProfile.role`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.3), tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/persistence.spec.js (F.2)

## Goals
- **G1 – Create Goal** As a user, I want to create a savings goal with a target and monthly contribution so that I can track progress.  
  - Acceptance Criteria: Given I’m in Settings → Goals, When I add a goal name, target amount, and monthly contribution and save, Then it is stored in `goals` with default scope/owner and appears in the list.  
  - Primary UI location(s): `nav-settings` → “Goals” section  
  - Key data/state involved: `goals`, `accounts` (optional link), `userProfile.role`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.2), tests/e2e/stability.spec.js

- **G2 – Goal Persistence on Reload** As a user, I want goals to remain after reload so that I don’t lose planning work.  
  - Acceptance Criteria: Given a goal was saved, When I reload and return to Settings → Goals, Then the goal name and target fields are populated with saved values.  
  - Primary UI location(s): `nav-settings` → “Goals” section  
  - Key data/state involved: `goals`, persisted storage (`cashflow-storage`)  
  - Test coverage reference: tests/e2e/regression.spec.js (R.2)

## Allocation Rules
- **AR1 – Save Allocation Rule** As a user, I want to define an income allocation rule so that paychecks are earmarked to accounts automatically.  
  - Acceptance Criteria: Given I’m in Settings → Allocation Rules, When I add a rule with account, type (percent/amount), value, and frequency and save, Then it is stored in `allocationRules` and reloads with those fields.  
  - Primary UI location(s): `nav-settings` → “Allocation Rules” section  
  - Key data/state involved: `allocationRules`, `accounts`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.4)

## Settings/Profile
- **S1 – Update Starting Balance** As a user, I want to set a starting balance so that projections reflect my initial cash.  
  - Acceptance Criteria: Given I’m in Settings → Accounts & Residual, When I enter a starting balance and save, Then `startingBalance` updates and is used in Planner/Home when no account balances are present.  
  - Primary UI location(s): `nav-settings` → “Accounts & Residual” section  
  - Key data/state involved: `startingBalance`, `accounts`  
  - Test coverage reference: tests/e2e/stability.spec.js

- **S2 – Update Income & Pay Schedule** As a user, I want to set my household income and pay days so that paychecks post on the right dates.  
  - Acceptance Criteria: Given I’m in Settings → Income & Pay Schedule, When I enter income amounts and day1/day2 and save, Then `income` and `paySchedule` persist for projections and auto-posting.  
  - Primary UI location(s): `nav-settings` → “Income & Pay Schedule” section  
  - Key data/state involved: `income`, `paySchedule`  
  - Test coverage reference: tests/e2e/stability.spec.js

## Persistence/Hydration
- **PH1 – Agent Demo Hydration** As a user in demo mode, I want the app to hydrate a demo profile automatically so that navigation works without signup.  
  - Acceptance Criteria: Given I load `/?agentDemo=1`, When the app initializes, Then `userProfile.uid` is set to “demo-user”, `setFullPlanData` seeds empty arrays, and `hasHydrated` flips to true allowing tabs to render.  
  - Primary UI location(s): app bootstrap (all nav tabs become active)  
  - Key data/state involved: `userProfile`, `accounts`, `bills`, `expenses`, `hasHydrated`  
  - Test coverage reference: tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/bills-flow.spec.js (C.1), tests/e2e/regression.spec.js

- **PH2 – Persisted Plan Reload** As a user, I want my plan data to reload from storage so that balances and transactions survive refreshes.  
  - Acceptance Criteria: Given data exists in `cashflow-storage`, When I reload the app, Then `useCashflowStore` merges persisted `accounts`, `transactions`, `recurringBills`, planner settings, and sets `hasHydrated`, making the data available to pages.  
  - Primary UI location(s): app bootstrap (hydration guard), downstream tabs (`nav-home`, `nav-expenses`, etc.)  
  - Key data/state involved: `accounts`, `transactions`/`expenses`, `recurringBills`, `plannerSettings`, `hasHydrated`, `lastAutoPostRunISO`  
  - Test coverage reference: tests/e2e/regression.spec.js (R.7)

## Auto-post income
- **AI1 – Auto-post Paychecks on Payday** As a user, I want scheduled paychecks to auto-post on or after the pay date so that income appears without manual entry.  
  - Acceptance Criteria: Given today matches or is after a pay date and `income` > 0 with an `accounts` deposit target, When auto-post runs, Then it creates salary transactions with ids prefixed `auto-salary`/`auto-paycheck` dated on or before today and sets `lastAutoPostRunISO` to today.  
  - Primary UI location(s): background hook in Planner/Home load; visible in Expenses list and balances  
  - Key data/state involved: `income`, `paySchedule`, `accounts`, `residualAccountId`, `expenses`/`transactions`, `lastAutoPostRunISO`  
  - Test coverage reference: tests/unit/autoPostPaychecks.test.mjs, tests/e2e/regression.spec.js (R.7)

- **AI2 – Auto-post Updates Balances Once Per Day** As a user, I want auto-posting to avoid duplicates and update the deposit account balance so that totals stay accurate.  
  - Acceptance Criteria: Given auto-post already ran today or a transaction with the same `sourceKey` exists, When auto-post runs again, Then no new paycheck is added and deposit account balances are unchanged; when it runs the first time, balances increase by the paycheck amount.  
  - Primary UI location(s): background hook; visible via `nav-accounts` and `nav-expenses`  
  - Key data/state involved: `lastAutoPostRunISO`, `expenses`/`transactions`, `accounts`, `residualAccountId`, `hasHydrated`  
  - Test coverage reference: tests/unit/autoPostPaychecks.test.mjs, tests/e2e/regression.spec.js (R.7)

## Coverage Map
- H1 → tests/e2e/regression.spec.js (R.1), tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/stability.spec.js  
- H2 → tests/unit/homeBillsDueAmount.test.mjs  
- P1 → tests/e2e/planner-flow.spec.js (D.1)  
- P2 → tests/e2e/planner-flow.spec.js (D.2)  
- P3 → tests/e2e/regression.spec.js (R.3, R.6)  
- P4 → tests/e2e/regression.spec.js (R.6)  
- B1 → tests/e2e/regression.spec.js (R.1), tests/e2e/stability.spec.js  
- B2 → tests/e2e/bills-flow.spec.js (C.1)  
- X1 → tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/regression.spec.js (R.3)  
- X2 → tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/persistence.spec.js (F.2)  
- X3 → tests/e2e/stability.spec.js  
- A1 → tests/e2e/regression.spec.js (R.1, R.6), tests/e2e/stability.spec.js  
- A2 → tests/e2e/regression.spec.js (R.5)  
- BU1 → tests/e2e/regression.spec.js (R.3), tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/persistence.spec.js (F.2)  
- G1 → tests/e2e/regression.spec.js (R.2), tests/e2e/stability.spec.js  
- G2 → tests/e2e/regression.spec.js (R.2)  
- AR1 → tests/e2e/regression.spec.js (R.4)  
- S1 → tests/e2e/stability.spec.js  
- S2 → tests/e2e/stability.spec.js  
- PH1 → tests/e2e/expenses-flow.spec.js (B.1), tests/e2e/bills-flow.spec.js (C.1), tests/e2e/regression.spec.js  
- PH2 → tests/e2e/regression.spec.js (R.7)  
- AI1 → tests/unit/autoPostPaychecks.test.mjs, tests/e2e/regression.spec.js (R.7)  
- AI2 → tests/unit/autoPostPaychecks.test.mjs, tests/e2e/regression.spec.js (R.7)
