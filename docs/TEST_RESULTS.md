# Comprehensive Test Report

## Unit Tests (exit code: 0)
```

> cashflow-app@0.0.1 test
> vitest run --config vitest.config.js


[7m[1m[36m RUN [39m[22m[27m [36mv1.6.1[39m [90mE:/cashflow-app[39m

 [32m✓[39m tests/firestore/securityRules.test.js [2m ([22m[2m3 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m tests/unit/dateFormat.test.js [2m ([22m[2m5 tests[22m[2m)[22m[90m 42[2mms[22m[39m
 [32m✓[39m tests/integration/settings.integration.test.js [2m ([22m[2m1 test[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m tests/integration/accounts.integration.test.js [2m ([22m[2m1 test[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m tests/unit/projectCashflow.test.js [2m ([22m[2m2 tests[22m[2m)[22m[90m 10[2mms[22m[39m
 [32m✓[39m tests/cashflowEngine.test.mjs [2m ([22m[2m5 tests[22m[2m)[22m[90m 11[2mms[22m[39m
 [32m✓[39m tests/unit/cashflowLogic.test.mjs [2m ([22m[2m2 tests[22m[2m)[22m[90m 14[2mms[22m[39m
 [32m✓[39m tests/integration/transactions.integration.test.js [2m ([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m20 passed[39m[22m[90m (20)[39m
[2m   Start at [22m 00:38:12
[2m   Duration [22m 2.03s[2m (transform 282ms, setup 2ms, collect 844ms, tests 95ms, environment 4ms, prepare 3.55s)[22m
```

## E2E Tests (exit code: 0)
```

Running 11 tests using 4 workers

[1A[2K[1/11] [chromium] › tests\e2e\planner-flow.spec.js:9:3 › Planner View (remote, agentDemo) › D.1 Planner renders Monthly snapshot and Projected section
[1A[2K[2/11] [chromium] › tests\e2e\bills-flow.spec.js:15:3 › Bills Flow (remote, agentDemo) › C.1 Mark first unpaid bill as paid
[1A[2K[3/11] [chromium] › tests\e2e\persistence.spec.js:7:3 › Persistence (remote, agentDemo) › F.2 Expense persists across reload
[1A[2K[4/11] [chromium] › tests\e2e\expenses-flow.spec.js:21:3 › Expenses Flow (remote, agentDemo) › B.1 & B.2 Add Expense updates Expenses tab and Home balance
[1A[2K[5/11] [chromium] › tests\e2e\settings-flow.spec.js:9:3 › Settings View (remote, agentDemo) › E.1 Renders settings layout and sections
[1A[2K[6/11] [chromium] › tests\e2e\smoke-gaps.spec.js:46:3 › Manual Smoke Gaps › Dead Button Audit shows toasts
[1A[2K[7/11] [chromium] › tests\e2e\smoke-gaps.spec.js:55:3 › Manual Smoke Gaps › Edit transaction in Expenses sheet updates amount
[1A[2K[8/11] [chromium] › tests\e2e\smoke-gaps.spec.js:95:3 › Manual Smoke Gaps › Add Transaction modal blocks empty submit
[1A[2K[9/11] [chromium] › tests\e2e\smoke-gaps.spec.js:107:3 › Manual Smoke Gaps › Plan lock persists after reload
[1A[2K[10/11] [chromium] › tests\e2e\smoke-gaps.spec.js:123:3 › Manual Smoke Gaps › "Today" expense counted in Actual mode
[1A[2K[11/11] [chromium] › tests\e2e\stability.spec.js:12:3 › User Journey & Functionality › Complete User Onboarding Flow
[1A[2K  2 skipped
  9 passed (24.1s)

To open last HTML report run:
[36m[39m
[36m  npx playwright show-report[39m
[36m[39m
```
