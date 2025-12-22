# Test Run Log

## Command: `npm test -- tests/unit`
- Status: ✅ passed
- Summary:
  - 5 files, 29 tests passed
  - Duration: 1.26s
  - Notable files: billSharing.test.mjs, projectCashflow.test.js, cashflowLogic.test.mjs

## Command: `npm test -- tests/integration`
- Status: ✅ passed
- Summary:
  - 4 files, 4 tests passed
  - Duration: 1.31s
  - Listener duplication integration now active and passing

## Command: `npx playwright test --config=playwright.visual.config.js --reporter=line`
- Status: ❌ failed
- Error: `TypeError: Cannot redefine property: Symbol($$jest-matchers-object)` raised during startup (before running specs).

## Command: `npx playwright test --config=playwright.config.js --reporter=line`
- Status: ❌ failed (8 failures, 2 skipped, 1 passed)
- Failure highlights:
  - Multiple specs could not find expected text like "Smart Cash Flow Planner" / "Smart Cash Flow" on initial navigation (expenses-flow, regression cases R1–R5).
  - Settings-flow failed waiting for `accounts-section` test id.
  - Persistence.spec timed out filling “Category name” input (Budgets flow).
- Duration: ~32.6s

Artifacts: See `test-results/` for screenshots and error-context files from failed Playwright runs.***

---

## Command: `npm test -- tests/unit`
- Status: ✅ passed
- Summary:
  - 5 files, 29 tests passed
  - Duration: 1.27s

## Command: `npm test -- tests/integration`
- Status: ✅ passed
- Summary:
  - 4 files, 4 tests passed
  - Duration: 1.25s

## Command: `npx playwright test --config=playwright.visual.config.js --reporter=line`
- Status: ❌ failed
- Summary:
  - 12 specs run; 9 passed, 1 skipped, 2 failed (planner-view and remote-planner-tab snapshots differ: expected 390x1826 vs actual 390x1890, ~0.02 ratio diff)

## Command: `npx playwright test --config=playwright.config.js --reporter=line`
- Status: ✅ passed (9 passed, 2 skipped)
- Notes: No failures in the e2e suite on this run.
