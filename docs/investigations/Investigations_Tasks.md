Investigation Tasks: Resolving the Seed vs. Hydration Issue

This document outlines the next set of tasks aimed at diagnosing and correcting the lingering problems in the R.6 and R.7 Playwright tests. The key concern is that the expectAppLoaded helper sometimes overwrites a pre‑seeded store even when a user profile is present, causing planners to render empty weeks or the auto‑salary test to fail. The tasks below will help isolate the root cause and guide code changes.

Task 1 – Examine the force‑injection condition

Read the current expectAppLoaded logic. Identify exactly which property triggers the fallback injection. Does it check state.userProfile or state.userProfile.uid? The log seed-flag-but-missing-user suggests that a non‑null userProfile without a defined uid is treated as missing.

Update the check. Modify the injection condition so it only triggers when state.userProfile is null/undefined or when state.userProfile.uid is an empty string. Use a strict check: if (!state.userProfile?.uid) return; to avoid overwriting a seeded profile that lacks other fields.

Respect the seed flag. Add a guard that reads window.sessionStorage.getItem('e2e-seeded'). If the flag is truthy, skip injection unless the store has no userProfile at all. The idea is to trust the seed when the test indicates it is present.

Task 2 – Verify and correct R.7 seed structure

Inspect basePersisted. Ensure the object used in R.7 has a state.userProfile with a valid uid (e.g., 'seeded-user-id') as well as role, householdId, and any other fields the app expects. Without these values, the hydrated store will contain a userProfile with uid: null, leading to forced injection.

Match Zustand’s persist schema. The persisted payload must follow { state: { … }, version: 0 }. Place userProfile inside the state object, not at the top level. Verify that all other persisted fields (accounts, plannerSettings, etc.) are correctly nested.

Seed timing. Confirm that installPersistedSeed() runs before the first navigation and that the session flag (e2e-seeded) is set before expectAppLoaded runs. If the order is wrong, reorder the calls so the seed is in place when the page loads.

Task 3 – Improve fallback state for R.6

Copy planner settings from R.7. The fallback injection currently inserts only a user profile and a default account. To allow the planner to compute weekly flows, the injected plannerSettings should include realistic defaults: startDate, startingBalance, income with zero values, a semi‑monthly pay schedule, and a mode (e.g. 'planned'). Use the structure from the R.7 plannerSettings as a template.

Initial balance. After creating an account in R.6, make sure the balance fields in the store (balance, balanceCents, currentBalance, currentBalanceCents) reflect the value entered via the UI. If Firestore writes fail, add a test helper that directly sets these fields via store.setState() after account creation.

Task 4 – Add state dump logging

Before injection, log the entire store. In expectAppLoaded, when deciding whether to inject fallback state, call window.__cashflowStore.getState() and log the result via console.log('Pre‑inject state:', JSON.stringify(state)). Include both state.userProfile and sessionStorage.e2e-seeded in the log.

After injection, log again. Immediately after performing an injection, log the new state. This will show exactly what was injected and help verify that the fallback state includes the necessary fields.

Ensure logs reach the test output. Continue to subscribe to page.on('console', ...) in the beforeEach hook so that these logs are visible in the terminal. This will greatly aid in correlating state snapshots with test outcomes.

Expected Outcome

By following these tasks, you should be able to:

Avoid overwriting valid seeded data when a userProfile is present (Task 1).

Ensure the persisted seed used by R.7 contains a valid user profile and matches the expected schema (Task 2).

Provide a richer fallback state for R.6 so that the planner renders meaningful data without Firestore (Task 3).

Gain visibility into the store’s contents at the moment of injection, making future debugging easier (Task 4).

Once these adjustments are made, the E2E tests should pass reliably without depending on external Firestore reads.