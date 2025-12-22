# Income → Cashflow Investigation Log

## Context
User observed: imported household bills + income schedule, created an account, pay date arrived, and nothing was added to cashflow.

## How to use this log
- Each investigation step appends a dated entry with findings and file paths.
- Do not delete previous entries; only append.
- Prefer concrete evidence: file paths, function names, keys, and quotes of relevant code (short excerpts only).

## Entries
(append below)

## Entry: Income → Cashflow Dataflow Map (2025-12-20)
- Source of truth: `income` (per-pay dollars per partner) + `paySchedule { type, day1, day2 }` live in the persisted Zustand store (`src/store/useStore.js`, defaults semi-monthly). They are set via `setFullPlanData` (direct keys or `plannerSettings`), demo seeding in `src/App.jsx:71-89`, Firestore hydration `src/hooks/useFirebaseSync.js` -> `setFullPlanData(fullData.data)`, Settings “Income & Pay Schedule” save (`src/pages/Settings.jsx:404-438`) calling `handleUpdateIncomeAndPaySchedule` in `src/hooks/useCashflowData.js` (persists via Firestore section `income` when signed in), and import preview apply (`src/pages/Settings.jsx:163-176`) which maps CSV/receipt payDays/frequency + incomes then calls the same handler.
- Consumers:
  - Home “Cash Flow” chart uses `useCashflowTimeline` (`src/hooks/useCashflowTimeline.js`) which pulls `startDate, accounts, bills, income, paySchedule, allocationRules, residualAccountId, paidBills, extraIncomes, expenses, mode` from the store and calls `projectCashflow` (`src/lib/cashflow/projectCashflow.js`). Pay schedule drives `enumerateSemiMonthlyPaydays` → salary income events deposited into the ledger; chart renders ledger balances.
  - Home balances/account cards (`src/pages/Home.jsx`) sum `accounts[*].currentBalance/currentBalanceCents/balance/openingBalance`; no cashflow engine or paySchedule/income usage, so paydays don’t move these numbers unless account data itself changes.
  - Planner top chart (`src/pages/Planner.jsx`) scopes to `personScope="self"`, filters `liveIncome` by role, bills by billSharing share, and calls `projectCashflow` with `livePaySchedule` (fallback semi-monthly), `liveExtraIncomes`, `liveExpenses`, `paidBills`, `allocationRules`, `residualAccountId`; timeline is the chart data, with planned vs actual driven by the `mode` prop.
  - Planner infographic (`src/MonthlyCashFlowInfographic.jsx`) consumes `liveIncome`/`livePaySchedule` (fallback semi-monthly) plus scoped bills/accounts/expenses/extraIncomes/allocationRules/residualAccountId and calls `projectCashflow` to build `monthlySummary` and `ledger` for both Planned/Actual modes. Actual mode overlays expenses/discretionary but income events remain scheduled (not transaction-driven).
- Differences (why Planner may show income while Home may not): Home balance cards are raw account balances (no projected deposits), so scheduled income only appears in engine-based views (Home chart/Planner) and not in the balance card. Planner charts scope to the viewer’s role while the Home chart uses household totals, so a single-partner income can appear on Home but zeroed in Planner (or vice versa if scope excludes it). Planner infographic pre-aggregates paid flags per month index and scopes bills; Home chart uses household bills/paidBills map, so timing/scope mismatches can create divergence even with identical schedules.
- Open questions: No runtime writer posts “income transactions” when a pay date passes—engine simulates paydays only. Should Home balance cards ever reflect projected deposits, or are they intentionally static until an account sync/manual update occurs?

## Entry: Auto-Realize Paycheck Check (2025-12-20)
- Conclusion: A) No auto-realize feature exists; “Actual” charts are simulated, not driven by posting income into account balances or transactions.
- Evidence: `projectCashflow` builds income events from `paySchedule` for all modes and does not gate them by date or paid flags (`src/lib/cashflow/projectCashflow.js:496-506`). Actual filtering only trims expenses to `ev.date <= todayCutoff` and bills to paid ones for past/today, but leaves income untouched (`projectCashflow.js:497-515`). “Today” is derived once per call via `getTodayISODate()` vs `new Date().toISOString()` and only used for those filters (`projectCashflow.js:377-379`). No timers/cron/setInterval beyond debounced UI persistence in `MonthlyCashFlowInfographic.jsx` (setTimeout at lines ~472, ~687) and receipt delays; no reconcile/roll-forward logic.
- If A: Users must either rely on the engine’s simulated income in charts (it shows scheduled pay regardless of date) or manually update account balances/transactions—no code writes deposits to store accounts when a pay date arrives. Planner tooltip text (“Actual = realized income/expenses up to today; future bills still included”, `src/pages/Planner.jsx:233`) overstates realization: income remains scheduled, not recorded.

## Entry: Import → Store → Engine Key Alignment (2025-12-20)
- Import entry points: CSV/AI sheet parsing (`src/services/csvScanner.js`, `src/services/receiptScanner.js` -> `scanBudgetSheet`) feed `importPreview` in `src/pages/Settings.jsx`. Final normalized payload is built in `confirmImport` (`Settings.jsx:125-245`).
- Imported key → Store key → Engine param:
  - `paySchedule.frequency`/`payDays[0|1]` → `paySchedule { frequency, day1, day2 }` via `handleUpdateIncomeAndPaySchedule` (`Settings.jsx:164-173`) → engine consumes `paySchedule` in `projectCashflow` (`src/lib/cashflow/projectCashflow.js`) but only reads `type/day1/day2` (missing `type` defaults to `semi-monthly`, day1/day2 used).
  - `incomes[].amount` (first two entries) → `income { husband, wife }` via `handleUpdateIncomeAndPaySchedule` → engine `income` (per pay event) in `projectCashflow`.
  - `expenses[].totalAmount/dueDay/accountId/payer` → `bills` via `handleUpdateBills` → engine `bills` in `projectCashflow` (amount treated as full bill, payer only affects UI scope).
  - No import mapping for `extraIncomes` or `startDate`; defaults remain (`useStore` default startDate, no extra incomes).
- Likely mismatch causes when “pay date arrived, no cashflow change”:
  1) `paySchedule.type` never set by import; engine ignores `frequency` and assumes semi-monthly. Any non–semi-monthly import (e.g., biweekly) will be projected on the wrong cadence.
  2) Income assignment is positional (first two `incomes` array → husband/wife) and drops any additional incomes; misordered or single-income households can map to the wrong partner or zero out the second, altering scope/allocations.
  3) Import doesn’t adjust `startDate`; projections anchor to existing/default start date. If user expected income to land relative to the imported payDays starting immediately, a stale start date can place the next paycheck outside the viewed window.

## Entry: Spec vs UI Copy vs Engine Behavior (2025-12-20)
- Truth statements:
  - Engine Actual keeps all scheduled income events regardless of date; it only filters expenses to `<= today` and bills to paid for past/today while keeping future bills (`src/lib/cashflow/projectCashflow.js:497-515`).
  - Pay schedule is always applied for income in both Planned and Actual (no paid flag gating).
  - “Today” cutoff uses `getTodayISODate` vs `new Date().toISOString()` to pick the later, then compares string dates (`projectCashflow.js:377-379`).
  - Goals apply in Actual only when confirmed; otherwise only in Planned (`projectCashflow.js:451-505`).
- Copy/spec contradictions:
  - UI text in Planner: “Actual = realized income/expenses up to today; future bills still included.” (`src/pages/Planner.jsx:233`). Engine does not require income to be “realized”; it keeps future income too.
  - Infographic hint: “Actual overlays paid bills and recorded expenses onto planned income/bills” (`src/MonthlyCashFlowInfographic.jsx:1291`) and “Planned baseline with paid bills and recorded expenses overlaid” (`src/MonthlyCashFlowInfographic.jsx:1420-1422`)—accurate for bills/expenses but silent about income being unfiltered.
  - Spec doc: “Actual semantics keep the full baseline (future income/bills) while overlaying expenses/paid status; goals reduce only when confirmed in Actual.” (`docs/cashflow-spec-vs-implementation.md:69,85`)—matches engine, conflicts with Planner UI “realized income” wording.
- Recommendation: Align copy/docs to engine. Easiest: adjust Planner/tooltip text to say “Actual keeps scheduled income, overlays paid bills + recorded expenses (goals only if confirmed).” If keeping “realized income” phrasing, engine would need to drop future income in Actual or gate by paid/recorded deposits to avoid user confusion; alternatively add a UX hint that income is projected, not auto-posted.

## Entry: Decision + Smallest Fix Plan (2025-12-20)
- Chosen interpretation: A (missing feature/expectation mismatch). Engine already simulates income in both modes without auto-posting to account balances; Home balance cards read raw account balances only. Prior entries show: engine keeps all scheduled income (`projectCashflow.js:496-506`), Actual does not drop future income; no code posts deposits into accounts. Planner UI copy currently says “Actual = realized income...” (`src/pages/Planner.jsx:233`), which suggests auto-posting that doesn’t exist.
- Why: Docs explicitly say Actual keeps full baseline and just overlays expenses/paid status (`docs/cashflow-spec-vs-implementation.md:69,85`); no writer for income transactions; Home balances sum account data only. So the reported “pay date arrived, nothing added” aligns with current design, not a broken implementation.
- Minimal UX change proposal: clarify that Actual keeps scheduled income and overlays expenses/paid bills; balances do not auto-update until user records deposits. Suggested text change in `src/pages/Planner.jsx` tooltip and/or `src/MonthlyCashFlowInfographic.jsx` hint to: “Actual keeps scheduled income, overlays paid bills and recorded expenses (goals only if confirmed). Balances update when deposits are recorded, not automatically on pay dates.” This avoids implying auto-posting while keeping behavior unchanged.

## Entry: Runtime Debug Switch Added (2025-12-20)
- File edited: `src/App.jsx` (central place where cashflow inputs are built and `projectCashflow` is invoked) to add a TEMP DEBUG logger.
- How to use: append `?debugCashflow=1` to the URL (e.g., `/?agentDemo=1&debugCashflow=1`). On load, the console logs a single object summarizing today, startDate, paySchedule, income, counts of accounts/bills, pay dates (income events) in the current month, sample income ledger entries, and any Actual overlay expenses.
- Notes: Logging is gated and memoized to avoid spamming; no runtime behavior changes.

## Entry: Auto-Post Paycheck Selector (2025-12-21)
- Module: `src/lib/income/autoPostPaychecks.js` exports `autoPostPaychecks({ todayISO, paySchedule, income, existingTransactions, depositAccountId }) => { newTransactions, debug }`. It is pure (no store), builds current-month semi-monthly paydays, and emits salary income transactions for any pay date <= today.
- Transaction shape: `{ id, source: "auto-paycheck", sourceKey, type: "income", category: "salary", description: "Auto Salary - <PARTNER>", date, amount (positive dollars), accountId, createdAt }`. Uses partner keys `husband`/`wife` with amounts from `income`.
- Idempotency: Deterministic `id/sourceKey = auto-paycheck:<partner>:<date>:<amountCents>:<accountId|none>`; skips creation when an existing transaction `id` or `sourceKey` matches.
- Default deposit account: caller passes `depositAccountId` (nullable); embedded in the id to keep dedupe deterministic per target account.
- Tests: `tests/unit/autoPostPaychecks.test.mjs` covers semi-monthly day1/day2 emission, duplicate avoidance when an existing auto paycheck is present, “before payday” yields none, and “after first payday” yields one. Suite run: `npm test` (pass).

## Entry: Actual Income Deduping in Engine (2025-12-21)
- File: `src/lib/cashflow/projectCashflow.js` (computeProjectCashflow).
- Change: In Actual mode, recorded income transactions (type `income`) are converted into `kind: "income"` events and used for dates <= `todayCutoff`; scheduled salary events on those dates are suppressed. Future income stays scheduled; Planned remains unchanged baseline.
- How duplicates are avoided: Build a `recordedIncomeByDate` map from income transactions; when normalizedMode is Actual, skip any scheduled income whose date has a recorded entry, and append the recorded income events for those dates instead.
- Assumptions: Income transactions are identified by `type === "income"` (e.g., auto-posted Salary). Amounts are positive dollars; cents preserved via `toCents`.

## Entry: Auto-Post Persistence & Tests (2025-12-21)
- Implemented: Auto-post hook in `src/hooks/useCashflowData.js` now enumerates current-month paydays, and on/after payday it creates deterministic Salary income transactions (`auto-salary:<role>:<date>:<account>`) and credits the residual account (fallback first account) by updating `currentBalance/currentBalanceCents`. Idempotency tracked via deterministic ids and store state.
- Persistence: Added `postedPaychecks` to the Zustand store initial state and persistence (`src/store/useStore.js` partialize/merge) so dedupe survives reload/offline/demo.
- Transaction shape: `{ id/sourceKey: auto-salary..., type: "income", category: "salary", description: "Auto Salary - H|W", date, amount (dollars), accountId, createdAt }`; credited account = residualAccountId else first account; if no account, transaction still recorded without balance bump.
- Tests: Unit coverage in `tests/unit/autoPostPaychecks.test.mjs` includes idempotency and balance delta; additional e2e case in `tests/e2e/regression.spec.js` checks for auto-salary visibility (balance assert still WIP). Commands run: `npm test` and `npm test tests/unit/autoPostPaychecks.test.mjs`; Playwright run attempted `npx playwright test tests/e2e/regression.spec.js` (R.7 still flaky on balance delta).
## Entry: Auto-Post Paychecks Requirements (2025-12-20)
- New required behavior: On each scheduled pay date, create a persisted income transaction (category “Income / Salary”, amount = scheduled paycheck) that bumps the chosen account balance automatically; must be idempotent across reloads/Firebase sync.
- Transaction model (AddTransactionModal/Expenses):
  - Transactions live in the `expenses` (alias `transactions`) array in the Zustand store and Firestore section `"expenses"`; writers: `AddTransactionModal` builds `{ id, date, amount, description, category, accountId, type, createdAt }` (defaults type=`"expense"`; type toggle supported) before calling `store.updateExpenses` (`src/components/AddTransactionModal.jsx:77-90`, `src/App.jsx:387-405`, `src/store/useStore.js:146-178`). The Expenses page uses the shared `TransactionForm` contract `{ type, amount, description, categoryId, accountId, date }` -> payload `{ id, type, amount, description, category, accountId, date, createdAt }` and persists via `handleUpdateExpenses` (Firestore section “expenses” via `createUpdateHandler`) (`src/components/transactions/TransactionForm.jsx:15-126`, `src/components/expenses/ExpenseFormSheet.jsx:45-81`, `src/hooks/useCashflowData.js:705-815,951-1050`).
  - Income vs expense is only a `type` flag for UI; `projectCashflow` treats every entry in `expenses` as an outflow (kind `expense`, `amountCents` deducted) regardless of `type`, so today an “income” transaction would reduce balances in Actual overlays (`src/lib/cashflow/projectCashflow.js:393-455`).
- Account balance model:
  - Displayed balances are stored, not derived from transactions. Home and account cards prefer `currentBalance`/`balance` (or `...Cents` heuristically divided by 100) and fall back to `openingBalance` (`src/pages/Home.jsx:113-333`; `src/pages/Accounts.jsx:147-210`). The cashflow engine seeds ledger balances from each account’s `openingBalance` only (`src/lib/cashflow/projectCashflow.js:150-180`). No writer adjusts balances when transactions are added, so auto-paycheck must explicitly mutate the account record to move UI balances.
- Idempotency plan:
  - Use a deterministic key per payday, e.g., `auto-paycheck:<date>:<payIndex>:<accountId>:<amountCents>`. Store it on the transaction itself (`id` and/or metadata fields like `source: "auto-paycheck"`, `sourceKey`) and skip creation if an existing transaction with the same `sourceKey` (or `id`) is present before calling `updateExpenses` (ensures Firestore/local dedupe).
- Default deposit account plan:
  - Prefer `residualAccountId` (store + engine allocation target) if set (`src/store/useStore.js:36-44,147-170`). Otherwise pick the first “checking”-style account: account `type` is usually `"deposit"`/`"savings"` in Settings, with some defaults using `"checking"` (`src/components/settings/AccountsForm.jsx:58-115`; `src/lib/cashflow/projectCashflow.js:175-180`). Fallback: first account in the array.
- Edge cases to handle:
  - Multiple incomes: store only has `income.husband`/`income.wife` and sums them into one per-pay amount (`projectCashflow.js:117-143`), so auto-post likely creates a single household paycheck transaction unless we split by role.
  - Pay schedule types: engine only supports semi-monthly; any other `paySchedule.type` defaults to a semi-monthly-like fallback (`projectCashflow.js:12-70`), so biweekly/weekly imports won’t match real cadence without extending enumerators.
  - Timezone/day boundary: “today” uses `max(getTodayISODate(), new Date().toISOString())` (`projectCashflow.js:332-338`) for Actual filtering; reuse that cutoff to avoid double-firing at UTC/local midnight boundaries.
