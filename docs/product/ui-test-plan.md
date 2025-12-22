# UI Test Plan
Structured manual and Playwright outlines for each user story in `docs/product/user-stories.md`.

## Home
- **H1 – Home Snapshot** — ✅ Covered (tests/e2e/regression.spec.js R.1; tests/e2e/expenses-flow.spec.js B.1; tests/e2e/stability.spec.js)
  - Manual: Open `/?agentDemo=1`; wait for `nav-home`; confirm “My Balance/Starting Balance” card shows formatted amount matching summed accounts or starting balance.
  - Playwright outline: `page.goto('/?agentDemo=1')`; expect `getByTestId('nav-home')` visible; read balance card `locator('div').filter({ hasText: /My Balance|Starting Balance/ }).first()`; assert text contains currency and changes after account add (reuse helper in regression).

- **H2 – Bills Due Indicator** — 🟡 Partially covered (tests/unit/homeBillsDueAmount.test.mjs)
  - Manual: Seed bills with different payers and paid flags; open Home; verify “My Bills Due” excludes partner-only bills and paid items, shows scoped sum.
  - Playwright outline: Programmatically set store via `window.__cashflowStore.setFullPlanData` with `bills`, `paidBills`, `billSharing`; navigate `nav-home`; assert `getByText('My Bills Due').locator('..')` contains expected amount for role; verify toggle role (if UI allows) otherwise inspect text.

## Planner
- **P1 – Planner Landing** — ✅ Covered (tests/e2e/planner-flow.spec.js D.1)
  - Manual: Tap `nav-planner`; confirm “Financial Analysis” heading and Planned Balance chart render.
  - Playwright outline: After `goto`, click `getByTestId('nav-planner')`; expect `getByRole('heading', { name: 'Financial Analysis' })` and `getByText('Planned Balance')` visible.

- **P2 – Planned vs Actual Toggle** — ✅ Covered (tests/e2e/planner-flow.spec.js D.2)
  - Manual: In Planner, locate Planned/Actual buttons; toggle Actual then back; verify both visible and selectable.
  - Playwright outline: `plannedButton = getByRole('button', { name: /^Planned$/i })`; `actualButton = getByRole('button', { name: /^Actual$/i })`; click Actual then Planned; assert both remain visible and selected state (e.g., has class or aria-pressed if present).

- **P3 – Actual Overlays Expenses** — ✅ Covered (tests/e2e/regression.spec.js R.3, R.6)
  - Manual: Record Planned/Actual end balances; add transaction via `nav-add`; return to Planner; verify Planned unchanged ~, Actual decreased by amount.
  - Playwright outline: Use helpers `readInfographicEndBalance(page, 'planned'|'actual')`; add transaction with modal; expect `plannedAfter ≈ plannedBefore` and `(plannedAfter - actualAfter) ≈ deltaBefore + amount`.

- **P4 – Week Rows Stay Consistent** — ✅ Covered (tests/e2e/regression.spec.js R.6)
  - Manual: Open Planner; scroll to Week 1 row; verify amounts non-zero; start + net ≈ end when present.
  - Playwright outline: Use `readWeekRowAmounts(page, /Week 1/i)`; assert `currencyTexts.length>0`, at least one non-zero; parse start/end/net via regex and expect `end ≈ start + net`.

## Bills
- **B1 – Add Bill** — ✅ Covered (tests/e2e/regression.spec.js R.1; tests/e2e/stability.spec.js)
  - Manual: Go to `nav-bills`; click Add Bill (empty state or header); fill name/amount/due day; save; confirm bill appears in list with amount.
  - Playwright outline: Use empty-state button `getByTestId('bills-empty').getByRole('button', { name: /add/i })` else header add; fill inputs (`getByLabel('Name')`, `getByLabel('Amount')`, `getByLabel('Day')` if present); save; expect entry in `getByTestId('bills-list')`.

- **B2 – Mark Bill Paid/Unpaid** — ✅ Covered (tests/e2e/bills-flow.spec.js C.1)
  - Manual: In Bills list, click unpaid circle; verify it switches to green check; optionally click again to revert.
  - Playwright outline: Locate unpaid toggle `locator('button').filter({ has: page.locator('svg.text-slate-300') }).first()`; click; assert `svg.text-emerald-600` visible; optionally assert paid flag reflected in storage/local state.

## Expenses/Transactions
- **X1 – Add Transaction from FAB** — ✅ Covered (tests/e2e/expenses-flow.spec.js B.1; tests/e2e/regression.spec.js R.3)
  - Manual: Tap `nav-add`; fill amount and description; save; modal closes.
  - Playwright outline: `getByTestId('nav-add').click();` fill `getByPlaceholder('0.00')`, `getByPlaceholder('For?')`; click `getByRole('button', { name: /Save transaction/i })`; expect modal hidden.

- **X2 – View Transactions List** — ✅ Covered (tests/e2e/expenses-flow.spec.js B.1; tests/e2e/persistence.spec.js F.2)
  - Manual: After adding transaction, open `nav-expenses`; confirm date section and row show description/amount.
  - Playwright outline: `getByTestId('nav-expenses').click();` expect `getByText('<desc>')` and amount text present; ensure grouping container `.divide-y` exists.

- **X3 – Edit or Delete Transaction** — ✅ Covered (tests/e2e/stability.spec.js)
  - Manual: In Expenses list, open a row; change amount; save; confirm updated; delete and confirm row gone.
  - Playwright outline: Select row via `getByText('Groceries').first()` (or dynamic description); open sheet; edit `getByLabel('Amount')`; save; assert new value; click delete control (if exposed) or use Confirm modal; assert row count decreases.

## Accounts
- **A1 – Add Account in Settings** — ✅ Covered (tests/e2e/regression.spec.js R.1, R.6; tests/e2e/stability.spec.js)
  - Manual: In Settings → Accounts & Residual, add account name/type/balance; save; return Home to see balance increase.
  - Playwright outline: Navigate to Settings; click `getByRole('button', { name: /Accounts & Residual/i })`; use `getByTestId('btn-add-account')`, `getByTestId('input-account-name')`, `getByTestId('input-account-balance')`; save via `getByTestId('btn-save-accounts')`; verify on Home balance delta or in `nav-accounts`.

- **A2 – Accounts Listing** — ✅ Covered (tests/e2e/regression.spec.js R.5)
  - Manual: Open `nav-accounts`; confirm heading and account cards show names/balances.
  - Playwright outline: `getByTestId('nav-accounts').click();` expect `getByRole('heading', { name: 'Accounts' })`; assert `getByText('Investment A')` and amount text `$1,234.56` visible.

## Budgets
- **BU1 – Create Budget Category** — ✅ Covered (tests/e2e/regression.spec.js R.3; tests/e2e/expenses-flow.spec.js B.1; tests/e2e/persistence.spec.js F.2)
  - Manual: In Settings → Budgets, click Add Category; fill name/limit; save; revisit to see persisted; ensure can select category when adding transaction.
  - Playwright outline: `nav-settings` → `getByRole('button', { name: /^Budgets$/i })`; click Add Category; fill `getByLabel('Category Name').last()` and `getByLabel('Monthly Limit').last()`; save `getByRole('button', { name: /Save budgets/i })`; assert inputs with values exist after reload.

## Goals
- **G1 – Create Goal** — ✅ Covered (tests/e2e/regression.spec.js R.2; tests/e2e/stability.spec.js)
  - Manual: In Settings → Goals, click Add Goal; fill name/target/monthly contribution; save; verify in list.
  - Playwright outline: `nav-settings` → `getByRole('button', { name: /^Goals$/i })`; click `getByRole('button', { name: /Add goal/i })`; fill `getByLabel('Name').last()`, `getByLabel('Target Amount').last()`, `getByLabel('Monthly Contribution').last()`; save via `getByRole('button', { name: /Save goals/i })`; assert value inputs visible after reload.

- **G2 – Goal Persistence on Reload** — ✅ Covered (tests/e2e/regression.spec.js R.2)
  - Manual: After saving a goal, reload app; return to Goals; confirm fields pre-populated.
  - Playwright outline: After save, `page.reload()`; navigate back to Goals; assert `locator('input[value="Tesla Fund"]').first()` etc. are visible.

## Allocation Rules
- **AR1 – Save Allocation Rule** — ✅ Covered (tests/e2e/regression.spec.js R.4)
  - Manual: In Settings → Allocation Rules, click Add Rule; set label/value/type/account; save; reload; confirm persisted.
  - Playwright outline: `nav-settings` → `getByRole('button', { name: /^Allocation Rules$/i })`; click `getByRole('button', { name: /Add rule/i })`; fill `locator('input[value="New rule"]').last()` with label; fill last number input; save via `getByRole('button', { name: /Save rules/i })`; after reload assert inputs retain values.

## Settings/Profile
- **S1 – Update Starting Balance** — ✅ Covered (tests/e2e/stability.spec.js)
  - Manual: Settings → Accounts & Residual; fill Starting balance; save; confirm value persisted and affects Home/Planner baseline.
  - Playwright outline: Navigate to Accounts section; `getByLabel('Starting balance')` fill; click `getByRole('button', { name: /^save$/i })`; assert balance reflected on Home via planned balance helper.

- **S2 – Update Income & Pay Schedule** — ✅ Covered (tests/e2e/stability.spec.js)
  - Manual: Settings → Income & Pay Schedule; enter incomes and day1/day2; save; confirm stored.
  - Playwright outline: `getByRole('button', { name: 'Income & Pay Schedule' }).click();` fill `getByTestId('input-income-husband')`, `getByTestId('input-income-wife')`; set pay day inputs/spinbuttons; click `getByTestId('save-income-btn')`; assert inputs retain values post save/reload.

## Persistence/Hydration
- **PH1 – Agent Demo Hydration** — ✅ Covered (tests/e2e/expenses-flow.spec.js B.1; tests/e2e/bills-flow.spec.js C.1; tests/e2e/regression.spec.js)
  - Manual: Load `/?agentDemo=1`; verify nav buttons render and data accessible without auth; confirm no hydration errors.
  - Playwright outline: `page.goto('/?agentDemo=1')`; expect `getByTestId('nav-home')` and `getByTestId('nav-add')` visible; optionally check `page.evaluate(() => window.__cashflowStore.getState().hasHydrated === true)`.

- **PH2 – Persisted Plan Reload** — ✅ Covered (tests/e2e/regression.spec.js R.7)
  - Manual: Seed storage with accounts/transactions; reload; ensure data appears in Accounts/Expenses; hydration completes.
  - Playwright outline: Use init scripts to seed `localStorage`/IndexedDB as in R.7; `page.reload()`; wait for `window.__cashflowStore.getState().hasHydrated`; assert seeded account balance and transaction appear (`nav-accounts`, `nav-expenses`).

## Auto-post income
- **AI1 – Auto-post Paychecks on Payday** — ✅ Covered (tests/unit/autoPostPaychecks.test.mjs; tests/e2e/regression.spec.js R.7)
  - Manual: Set today to payday via init script; load app; verify salary transaction auto-created and appears in Expenses; account balance increases.
  - Playwright outline: Use `installMockToday`/`setMockToday` helpers; seed store with pay schedule/income/accounts; reload; poll `nav-expenses` for `getByText(/Auto Salary/)`; assert balance via Accounts page greater than before.

- **AI2 – Auto-post Updates Balances Once Per Day** — ✅ Covered (tests/unit/autoPostPaychecks.test.mjs; tests/e2e/regression.spec.js R.7)
  - Manual: Trigger auto-post once; note balance/transaction count; re-trigger same day; ensure no duplicate and balance unchanged.
  - Playwright outline: After first auto-post (see AI1), rerun hydration with same `lastAutoPostRunISO` or keep today constant; assert `Auto Salary` count stays 1 and account balance remains stable across subsequent reloads.
