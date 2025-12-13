# Cashflow App – Manual Smoke Test & UI Verification

Navigation facts for this codebase:
- Tabs, not URL routes. Bottom nav IDs/labels: `home` (Home), `planner` (Planner), `expenses` (Expenses), center FAB `add` (Add Transaction modal), `bills` (Bills), `settings` (Settings).
- Home opens by default. The Bills “See all” link and BottomNav both call `setTab`, not route changes.
- Shared transaction form lives in `src/components/transactions/TransactionForm.jsx`; the modal shell is `AddTransactionModal` (FAB) and the sheet shell is `ExpenseFormSheet` (Expenses page).
- Cashflow infographic and the “Lock this plan” action live inside `src/MonthlyCashFlowInfographic.jsx` on the Planner tab.

## Phase 1: Visual Cohesion (Look & Feel)
Goal: Validate the refactor UI tokens across the real screens.

Settings → Accounts & Residual (Settings tab, tap “Accounts & Residual”)
- [ ] Inputs: Field heights/borders/focus rings match other forms.
- [ ] Primary buttons: “Add account” (top right) and “Save accounts” (appears when dirty) use the primary style.
- [ ] Spacing: Rows in the account list and residual selector align consistently (no ad-hoc margins).

Bills tab (`bills`)
- [ ] Actions: Inline “Edit” / “Delete” buttons render as ghost buttons with icons (Pencil/Trash), not links.
- [ ] Add: “Add Bill” button (or “Add your first bill” in empty state) is primary and aligned with header content.

Home tab (`home`)
- [ ] Bills link: The “See all” button in Upcoming Bills (variant `link`) reads “See all” with the ArrowRight icon and looks like a secondary/ghost action.
- [ ] Typography: Header “Smart Cash Flow Planner”, card headers/body text follow the defined hierarchy (title vs. caption sizes) across the hero, stats, and Upcoming Bills cards.

## Phase 2: Interactive Functionality (Click Everything)
Goal: Catch dead clicks and confirm the shared TransactionForm works in both shells.

A. Dead Button Audit
- Top Bar bell (any tab): Click the Bell icon. Expect an info toast “No new notifications yet.” (must not be a no-op).
- Planner “Adjust Range” (Planner tab header): Click the secondary “Adjust Range” button with Calendar icon. Expect toast “Adjust range coming soon.” (not disabled).
- Expenses search: There is no search bar on `expenses`; confirm no search input is rendered (only a Search icon in the empty state card).

B. Shared Transaction Form (critical)
- Path 1 – Global FAB (modal shell):
  - [ ] Tap the center FAB (`Add` in BottomNav). Expect `Add Transaction` modal.
  - [ ] Enter amount (e.g., 50.00), description, category, and account (if present). Save button text: “Save transaction”.
  - [ ] Result: Modal closes, toast “Transaction added.”, expense list/store updates.
- Path 2 – Expenses page add (sheet shell):
  - [ ] Go to `expenses` tab; tap the primary + button in header (“Add transaction” icon).
  - [ ] Sheet slides up titled “New Transaction”. Fill fields and click “Save transaction”.
  - [ ] Result: Sheet closes, toast “Transaction added.”, new item appears in the list.
- Path 3 – Edit existing (sheet shell):
  - [ ] On `expenses`, tap an existing TransactionRow. Sheet title: “Edit Transaction” with fields pre-filled.
  - [ ] Change amount, click “Save transaction”.
  - [ ] Result: Toast “Transaction updated.”, list reflects the change immediately.
- Offline/Validation:
  - [ ] Submit with empty Amount or Description. Expect inline error text (“Amount must be greater than 0.” / “Description is required.”) and form stays open.
  - [ ] If offline, the FAB is blocked by `isOnline` (modal will not open). Expense sheet does not auto-disable fields when offline—note the limitation if testing offline mode.

## Phase 3: Cashflow Logic (Engine Check)
Goal: Validate “expense on today counts in actual mode” and plan lock persistence.

“Today” test (actual mode)
- [ ] On Planner tab, in the Cashflow Infographic header, switch mode to `Actual` (Projected/Actual toggle).
- [ ] Go to Home; note the “Expenses” value in the Quick Stats card.
- [ ] Add a new expense dated today (via FAB or Expenses sheet).
- [ ] Return to Home (Actual mode persists). Expect the “Expenses” value to increase by the new amount.

Plan lock/persistence
- [ ] On Planner tab → Cashflow Infographic, in “Available to spend”, click the green “Lock this plan” pill.
- [ ] Expect toast “Plan locked for this scope.” and “Clear confirmed amount” link to appear.
- [ ] Refresh the app/page; confirm the lock persists (confirmed amount still applied and “Clear confirmed amount” still visible).

## Phase 4: Automated Final Check
Run in repo root:
- [ ] `npm run build` — ensure deletion of old assets didn’t break the build.
- [ ] `npm test` — watches `tests/cashflowEngine.test.mjs` (file exists under `tests/`); all tests should pass.
