# Stability Test Summary

## Overall Results
- Ran: `npx playwright test tests/e2e/stability.spec.js --config=playwright.remote.config.js --reporter=line`
- Outcome: 1 passed, 1 failed.

## Detailed Failures
- **Test:** A.1 Rapid route switching does not crash (loop regression check)  
  - **Error:** `expect(locator).toBeVisible()` timed out; no matching element found.  
  - **Locator:** `getByText(/Upcoming Bills|Mark Paid/i)`  
  - **File/Line:** tests/e2e/stability.spec.js:55  
  - **Screenshot:** `test-results/e2e-stability-Stability-Sm-ef135-rash-loop-regression-check--chromium/test-failed-1.png`  
  - **Trace/Error Context:** `test-results/e2e-stability-Stability-Sm-ef135-rash-loop-regression-check--chromium/error-context.md`  
  - **Root-cause guess:** The Bills page in agentDemo shows an empty state (“You haven't added any bills yet.”) without the expected text “Upcoming Bills” or “Mark Paid,” so the selector never matches. This is a test assumption vs. UI content mismatch rather than a crash.

## Passing Tests
- **A.2 Demo mode vs auth screen** — Passed. Confirmed login screen appears without `agentDemo` and Home appears with `agentDemo=1`.

## Screenshots & Artifacts
- Failed test screenshot: `test-results/e2e-stability-Stability-Sm-ef135-rash-loop-regression-check--chromium/test-failed-1.png`
- Error context (DOM snapshot): `test-results/e2e-stability-Stability-Sm-ef135-rash-loop-regression-check--chromium/error-context.md`

## Root-Cause Analysis
- The only failure is due to asserting text that isn’t present in the Bills empty state. The page renders “You haven't added any bills yet.” and “Add your first bill,” so the test can’t find “Upcoming Bills” or “Mark Paid.”
- No console errors were detected by the test harness.

## Recommendations / Next Actions
- Update the Bills assertion to handle the empty state (e.g., check for “You haven't added any bills yet.” or for the “Add your first bill” CTA) in agentDemo data, or seed a bill before asserting “Upcoming Bills/Mark Paid.”
- If the intent is to ensure the grid renders even when empty, assert on stable headings like the page title (“My Wallet”/“Bills”) or a data-testid rather than “Upcoming Bills.”
