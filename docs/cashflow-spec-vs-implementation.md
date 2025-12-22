## Implementation status (completed)
- Planned vs Actual naming is surfaced across Planner and Infographic; toggles read Planned/Actual and default to Planned/self scope.
- Home gates on `hasHydrated` and formats money with cents; Bills and Planner stay in self scope using `isBillVisibleInSelfScope` + `getScopedBillAmount`.
- Accounts now gates on `hasHydrated` and shows a skeleton before data loads.
- Visual specs use a stable 390x844 viewport and `/?agentDemo=1` (home, bills, accounts, planner planned/actual, infographic self/household); screenshots renamed accordingly with tighter diff tolerance.
- E2E regression/planner flows updated to Planned wording and Actual overlay assertions; regression uses planned balance helpers.
- Infographic exposes scope labels (“Scope: Your share” / “Scope: Household total”) and planned/actual helper text describing overlay semantics.
- Planned vs Actual semantics, weekly carry fields, listener dedupe, and demo math sanity are now verified (see commands below).

## Data model + source of truth map
- The Zustand plan store holds profile, planner settings, entities, and UI flags; `setFullPlanData` normalizes legacy aliases (transactions->expenses, recurringBills->bills), unpacks `plannerSettings`, and merges simple keys plus `userProfile`, so any writer using it populates both legacy and current slices (src/store/useStore.js:90).
- Persisted slice is scoped to planner data: `partialize` stores accounts, transactions/expenses, recurringBills/bills, plannerSettings, paidBills, categoryBudgets, goals, extraIncomes, allocationRules, and mode (preferring non-legacy aliases when present) (src/store/useStore.js:195). `merge` rehydrates with legacy fallbacks (expenses/transactions, bills/recurringBills), restores plannerSettings onto root keys, and marks `hasHydrated` true (src/store/useStore.js:214).
- Persistence is patched to also persist `confirmedDiscretionary`, wrap IndexedDB storage with a localStorage/memory fallback, and ensure `setFullPlanData` always flips `hasHydrated` even when called outside rehydrate (src/store/useCashflowStore.js:41; src/store/useCashflowStore.js:112).
- The IndexedDB adapter uses a dedicated object store and falls back to in-memory storage when IndexedDB is unavailable; it logs and swallows storage errors to avoid crashes (src/store/storage.js:41; src/store/storage.js:55).
- Remote source of truth is the Firestore `users/{uid}` doc: `useFirebaseSync` subscribes via `onAuthStateChanged` + `onSnapshot` and pushes `profile` and `data` into the store with `setUserProfile`/`setFullPlanData`; it resets the store on sign-out (src/hooks/useFirebaseSync.js:32; src/hooks/useFirebaseSync.js:85; src/hooks/useFirebaseSync.js:113).
- A parallel singleton in `useCashflowData` also registers auth + `onSnapshot`; it seeds hook state, loads household members, and on snapshot error (or offline/demo) falls back to a persisted store snapshot merged with defaults and writes it through `setFullPlanData` (src/hooks/useCashflowData.js:409; src/hooks/useCashflowData.js:459; src/hooks/useCashflowData.js:524; src/hooks/useCashflowData.js:561).
- Demo-mode seeding: when `agentDemo=1`, App sets a mock profile and calls `setFullPlanData` with empty arrays and planner settings so pages read from the store without Firebase (src/App.jsx:71; src/App.jsx:82).
- UI-scoped local storage uses the safe wrapper; Bills stores the selected month in a household-scoped key via `makeScopedKey` + `safeLocalStorage` (src/lib/safeLocalStorage.js:51; src/pages/Bills.jsx:545; src/pages/Bills.jsx:562).

## Hydration / persistence contract
- Rehydrate path: `persist.merge` maps legacy keys, normalizes lists, and sets `hasHydrated`; `onRehydrateStorage` also calls `setHasHydrated` so components can gate rendering (src/store/useStore.js:214; src/store/useStore.js:258).
- `useCashflowStore` patches `setFullPlanData` to mark hydration complete, even for runtime writes (src/store/useCashflowStore.js:112).
- Persistence fallback: patched storage tries IndexedDB first, then safe localStorage, then memory to avoid crashes in private mode/SSR (src/store/useCashflowStore.js:69).
- Data lifecycle (happy path): Auth change -> `useFirebaseSync` auth listener -> Firestore `onSnapshot` -> `setUserProfile` + `setFullPlanData` -> `persist.partialize` writes to IndexedDB -> future loads hydrate via `merge`/`onRehydrateStorage` (src/hooks/useFirebaseSync.js:32; src/store/useStore.js:195; src/store/useStore.js:214).
- Data lifecycle (fallback/demo): If Firebase is offline/missing or `agentDemo=1`, `useCashflowData` reads the persisted store snapshot + defaults, writes it via `setFullPlanData`, and serves hook state locally; snapshot errors also trigger the same fallback (src/hooks/useCashflowData.js:409; src/hooks/useCashflowData.js:524; src/hooks/useCashflowData.js:561).
- Concurrent listeners: Both `useFirebaseSync` and `useCashflowData` register their own auth + `onSnapshot` singletons; each module guards against duplicate listeners per module, but running both means two Firestore listeners can coexist (src/hooks/useFirebaseSync.js:32; src/hooks/useCashflowData.js:409). Needs verification after listener dedupe changes.

## setFullPlanData write points and key coverage
- Normalization/mapping: Calling `setFullPlanData` writes transactions/expenses and recurringBills/bills in tandem, applies plannerSettings fields, and merges provided simple keys (startDate, startingBalance, income, paySchedule, billSharing, residualAccountId, mode, accounts, goals, categoryBudgets, extraIncomes, allocationRules, paidBills, confirmedDiscretionary, userProfile) (src/store/useStore.js:90).
- Firebase pull: Firestore snapshots invoke `setFullPlanData(fullData.data)`, letting the mapper handle legacy aliases (src/hooks/useFirebaseSync.js:85).
- Local fallback/demo: `useCashflowData` uses `setFullPlanData` when seeding demo data, offline fallback, or snapshot errors (src/hooks/useCashflowData.js:524; src/hooks/useCashflowData.js:561; src/hooks/useCashflowData.js:470).
- App/UI writers: Demo effect seeds plan data; Settings callbacks call `setFullPlanData` for income/paySchedule, startingBalance, and billSharing (src/App.jsx:71; src/App.jsx:371; src/App.jsx:374; src/App.jsx:375).
- Mutation handlers: `updateBills`/`updateExpenses`/`updateAccounts` write both legacy and current keys; `handleUpdateBills` and the generic `createUpdateHandler` in `useCashflowData` optimistically mirror edits into the store via `setFullPlanData`, covering bills, accounts/residualAccountId, allocationRules, goals, categoryBudgets, expenses, extraIncomes, billSharing, and startingBalance (src/store/useStore.js:151; src/store/useStore.js:163; src/hooks/useCashflowData.js:629; src/hooks/useCashflowData.js:786).

## Writers vs Readers (plan state)
| Slice | Writers | Readers |
| --- | --- | --- |
| Planner settings (startDate, startingBalance, income, paySchedule, billSharing, residualAccountId, mode) | Firestore snapshot -> `setFullPlanData`; App demo seeding; Settings `onUpdate*` handlers; `createUpdateHandler` for startingBalance/billSharing; `setMode` via Planner props (src/hooks/useFirebaseSync.js:85; src/App.jsx:71; src/App.jsx:371; src/hooks/useCashflowData.js:786; src/App.jsx:339) | App builds cashflow inputs and planner props; Planner reads `mode` via props; Bills needs `startDate`; Home uses `startDate` for chart window (src/App.jsx:166; src/pages/Planner.jsx:317; src/pages/Bills.jsx:351; src/pages/Home.jsx:62) |
| Accounts + residualAccountId | Firestore snapshot; App demo seeding; Settings `onUpdateAccounts`; `handleUpdateAccounts` (writes residualAccountId too) (src/hooks/useFirebaseSync.js:85; src/App.jsx:71; src/App.jsx:368; src/hooks/useCashflowData.js:836) | App cashflow inputs and Planner infographic props; Bills account dropdowns; Accounts page renders filtered accounts (src/App.jsx:166; src/pages/Bills.jsx:375; src/pages/Accounts.jsx:31) |
| Bills/recurringBills + paidBills + billSharing | Firestore snapshot; App demo seeding; Settings `onUpdateBills`; `handleUpdateBills` + `handleTogglePaid` + `handleBulkMark`; `setFullPlanData` maps bills<->recurringBills (src/hooks/useFirebaseSync.js:85; src/App.jsx:71; src/App.jsx:369; src/hooks/useCashflowData.js:629; src/hooks/useCashflowData.js:676; src/store/useStore.js:103) | Home renders bills due count; Bills page uses bills, paidBills, billSharing; Planner uses scoped bills; Accounts links bills to accounts (src/pages/Home.jsx:64; src/pages/Bills.jsx:315; src/pages/Planner.jsx:50; src/pages/Accounts.jsx:45) |
| Expenses/transactions | Firestore snapshot; App demo seeding; AddTransactionModal uses `updateExpenses`; `createUpdateHandler("expenses")` mirrors edits (src/hooks/useFirebaseSync.js:85; src/App.jsx:71; src/App.jsx:387; src/hooks/useCashflowData.js:847) | App cashflow inputs; Planner infographic props; Home timeline via `useCashflowTimeline` pulls expenses/transactions (src/App.jsx:166; src/pages/Planner.jsx:56; src/hooks/useCashflowTimeline.js:23) |
| Goals, categoryBudgets, allocationRules, extraIncomes | Firestore snapshot; App demo seeding; Settings `onUpdateGoals`/`onUpdateBudgets`; `createUpdateHandler` writes each slice; infographic merge writes only updates Firestore/hook state (not store) (src/hooks/useFirebaseSync.js:85; src/App.jsx:71; src/App.jsx:372; src/hooks/useCashflowData.js:841; src/hooks/useCashflowData.js:912) | App cashflow inputs and Planner props; Accounts page links goals/budgets by account; Home budgets list built from categoryBudgets (src/App.jsx:166; src/pages/Accounts.jsx:45; src/pages/Home.jsx:224) |
| User profile + confirmedDiscretionary | Firestore snapshot writes profile; demo seeding sets profile; persistence patch ensures confirmedDiscretionary saved/merged (src/hooks/useFirebaseSync.js:85; src/App.jsx:71; src/store/useCashflowStore.js:50) | App login gate and role selection; Bills role-aware filters; Planner role-based scoping; Accounts role filters accounts (src/App.jsx:114; src/pages/Bills.jsx:328; src/pages/Planner.jsx:30; src/pages/Accounts.jsx:49) |

## Cross-page data flow map (Zustand vs local state)
- Home reads `userProfile`, `startDate`, `accounts`, `bills`, `billSharing`, `paidBills` directly from the store and builds the chart via `useCashflowTimeline`, which pulls the same store slices plus income/paySchedule/allocationRules/residualAccountId/extraIncomes/expenses/mode; UI state is local. Rendering is gated on `hasHydrated`; money formats to 2 decimals; "My Bills Due" sums scoped unpaid bills (src/pages/Home.jsx:61-68, 131-158; src/hooks/useCashflowTimeline.js:23; src/App.jsx:71).
- Bills reads store slices (`userProfile`, `startDate`, `bills`, `accounts`, `residualAccountId`, `categoryBudgets`, `paidBills`, `billSharing`) and uses non-subscribing `useCashflowData` handlers for writes; UI filters/search, sheet state, and the selected month (persisted) are local. Demo-mode data uses the same store keys (src/pages/Bills.jsx:315; src/pages/Bills.jsx:545; src/App.jsx:71).
- Planner receives most data as props built from the store in App; it reads `userProfile` and `billSharing` from the store to scope projections, while timelines and infographic inputs come from props derived from store state; demo-mode props come from the same store seeding (src/pages/Planner.jsx:30; src/App.jsx:166; src/App.jsx:317).
- Accounts defaults to store data for accounts/bills/goals/categoryBudgets and role, with optional prop overrides; grouping/filtering is memoized; hydration is gated with a skeleton (src/pages/Accounts.jsx:31; src/pages/Accounts.jsx:59; src/App.jsx:71).

## My share vs Household math
- Canonical helpers: `getRoleSharePercent`, `isBillVisibleInSelfScope`, and `getScopedBillAmount` handle role-based filtering and amounts; defaults to 50/50 when billSharing is missing and treats payer=`H/W` as owner, `Shared/AUTO/undefined` as splittable (src/lib/billSharing.js:178-221).
- Home view: Filters bills with `isBillVisibleInSelfScope` and sums `getScopedBillAmount` for "My Bills Due"; copy matches self-scope (src/pages/Home.jsx:131-147; src/pages/Home.jsx:198-201).
- Bills view: Listing/totals use `isBillVisibleInSelfScope` plus `getScopedBillAmount`; banner "you're responsible for" stays self-scope (src/pages/Bills.jsx:620-646; src/pages/Bills.jsx:810-822; src/pages/Bills.jsx:191-205).
- Planner: Invoked with `personScope` locked to self and scoped bills before engine; chart/infographic run on my share (src/pages/Planner.jsx:71-90).
- Infographic: Uses `effectivePersonScope`; self -> `isBillVisibleInSelfScope` + `getScopedBillAmount`, both -> full amounts. Scope label surfaces "Scope: Your share" vs "Scope: Household total" to match math (src/MonthlyCashFlowInfographic.jsx:815-821; src/MonthlyCashFlowInfographic.jsx:1064-1186).
- Upcoming Bills: Hook exists but is unused; no UI renders it (src/hooks/useUpcomingBills.js).

### Cross-view scope table
| View | Filter rule | Amount rule | Scope label source | Mismatch risk |
| --- | --- | --- | --- | --- |
| Home | `isBillVisibleInSelfScope` (self) (src/pages/Home.jsx:139) | `getScopedBillAmount` (self share) (src/pages/Home.jsx:144) | Text "My Bills Due" implies self (src/pages/Home.jsx:198) | Low |
| Bills | `isBillVisibleInSelfScope` (self) (src/pages/Bills.jsx:620) | `getScopedBillAmount` per item/tiles (src/pages/Bills.jsx:635-646; src/pages/Bills.jsx:836-965) | Banner "you're responsible for" (self) (src/pages/Bills.jsx:700-705) | Low |
| Planner | Filters to self via `isBillVisibleInSelfScope`; scoped amounts before engine (src/pages/Planner.jsx:71-90) | `getScopedBillAmount` (self) (src/pages/Planner.jsx:81) | Heading “Financial Analysis” (no explicit scope text) | Medium (implicit) |
| Infographic | `effectivePersonScope` => self or both (src/MonthlyCashFlowInfographic.jsx:815-821) | Self share or household depending on scope (same lines) | `scopeLabel` text (src/MonthlyCashFlowInfographic.jsx:1064-1186) | Medium if exported in household unexpectedly |
| Upcoming Bills | Hook exists but unused (src/hooks/useUpcomingBills.js) | N/A | N/A | Low |

## Alignment decisions (locked)
- Planned vs Actual naming is canonical; Planned = baseline schedule (income + bills + goal reserves, budgets tracking-only); Actual keeps the same baseline and overlays paid bills/recorded expenses; goals only reduce when confirmed in Actual.
- Scope defaults to self for Planner/Infographic and exports; scope labels must match math.
- Weekly breakdown rows must include start/end balances with income/bills/goals/expenses/net; UI uses engine weeks or reconstructs from the ledger if absent.
- Money shows cents (no integer rounding) across Home/Bills/Planner/Accounts.
- Hydration guards: Home and Accounts gate on `hasHydrated`; other pages rely on store data immediately.
- Demo/test entry remains `/?agentDemo=1`; visual viewport is 390x844 with named snapshots per page/mode.
- No export/PDF pipeline exists today; scope defaults/labels are UI-only.

## Spec vs Current gap list
- Resolved
  - Home hydration gate and cents formatting.
  - Planner/Infographic UI toggles Planned/Actual and defaults to self scope with scope labels.
  - Accounts hydration skeleton prevents pre-hydrate zeros.
  - Visual specs updated to 390x844 with explicit demo entry and scoped snapshot names.
  - Regression/Planner E2E updated to Planned wording and Actual overlay assertions.
- Verified
  - Actual semantics keep the full baseline (future income/bills) while overlaying expenses/paid status; goals reduce only when confirmed in Actual (tests/unit/projectCashflow.test.js via `npm test`; tests/e2e/regression.spec.js via `npx playwright test tests/e2e/regression.spec.js`).
  - Weekly start/end balances and income/bills/goals/expenses/net carry fields are emitted in cents and consistent (tests/unit/projectCashflow.test.js and tests/unit/buildWeeklyView.test.mjs via `npm test`).
  - Listener dedupe ensures a single auth/snapshot subscription and one hydration flip (tests/integration/listenerDuplication.integration.test.js via `npm test`).
  - Demo-mode math sanity: Planned and Actual both include future baseline; Actual diverges only after expense overlay; scope defaults to self; weekly rows non-zero (tests/e2e/regression.spec.js via `npx playwright test tests/e2e/regression.spec.js`).
  - Money units sanity confirmed through cents-based assertions in the above unit/e2e suites.
- Remaining
  - Full suite reruns after future changes and visual snapshot updates when UI shifts.

## How to verify
- `npm run build` (build succeeds)
- `npm test` (unit + integration suites)
- `npx playwright test tests/e2e/regression.spec.js` (deterministic demo math + baseline vs overlay)
- `npm run test:e2e` (full e2e sweep)
- `npm run test:visual` or `npm run test:visual -- --update-snapshots` after tests pass (visuals at 390x844)

## Verification notes
- Recommended: `npm run build` (primary verification)
- Additional: `npm test` for unit suite; `npx playwright test --config=playwright.visual.config.js` for visuals; check package.json for exact script names.
- e2e/demo sanity: `npx playwright test tests/e2e --grep agentDemo` or run targeted specs with `/?agentDemo=1`.
