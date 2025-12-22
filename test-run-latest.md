# Test run log

Commands executed in sequence:

1) `npm test -- tests/unit`
```
vitest run --config vitest.config.js tests/unit
✓ tests/unit/billSharing.test.mjs (8 tests)
✓ tests/unit/dateFormat.test.js (5 tests)
✓ tests/unit/cashflowEngine.test.mjs (5 tests)
✓ tests/unit/cashflowLogic.test.mjs (7 tests)
✓ tests/unit/projectCashflow.test.js (4 tests)
Test Files 5 passed; Tests 29 passed
```

2) `npm test -- tests/integration`
```
vitest run --config vitest.config.js tests/integration
✓ tests/integration/listenerDuplication.integration.test.js (1 test)
✓ tests/integration/settings.integration.test.js (1 test)
✓ tests/integration/accounts.integration.test.js (1 test)
✓ tests/integration/transactions.integration.test.js (1 test)
Test Files 4 passed; Tests 4 passed
```

3) `npx playwright test --config=playwright.visual.config.js --reporter=line`
```
Running 12 tests using 4 workers
Failed (2), Skipped (1), Passed (9)
 - tests/visual/planner.spec.js:6:3 › Planner Visuals › should render planner view (snapshot size diff: expected 390x1826, received 390x1890; 0.02 ratio diff)
 - tests/visual/remote.visual.spec.js:36:3 › Visual Regression (remote, agentDemo) › Planner tab visual (same snapshot size diff as above)
```

4) `npx playwright test --config=playwright.config.js --reporter=line`
```
Running 11 tests using 4 workers
Passed (9), Skipped (2), Failed (0)
```
