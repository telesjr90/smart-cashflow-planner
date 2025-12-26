Investigation Tasks: Fixing R.6 and R.7 E2E Failures
This document outlines a set of tasks that need to be completed to diagnose and remediate the remaining
E2E failures in tests R.6 (Planner) and R.7 (Income auto‑posts). Focus on understanding why the current
“forced state” fixes are inadequate and how to make the injected state and seeds behave predictably.
Task 1 – Debug the “Invisible Seed” in R.7
Verify initialization timing. The test uses installPersistedSeed() to seed IndexedDB and
localStorage before navigation. Confirm that the window.sessionStorage.setItem('e2eseeded','true') call happens before expectAppLoaded executes. Use console logs or
page.evaluate() to print sessionStorage.getItem('e2e-seeded') at various points
(immediately after navigation, inside expectAppLoaded , etc.) to ensure the flag is present when it
needs to be.
Check seed content. Open the basePersisted object used in R.7 and confirm whether it
contains a non‑null userProfile . If userProfile.uid is missing, expectAppLoaded will
treat the page as unseeded and overwrite the seed. Hypothesis: the seeding may correctly write
IndexedDB but leaves userProfile empty, triggering the fallback.
Determine order of effects. Investigate if the initial auto‑login effect runs before the persisted state
hydrates. If the init script writes the seed to storage after expectAppLoaded already decided to
inject, the seed gets clobbered. Look at the Playwright beforeEach hook order to identify any race
conditions.
Task 2 – Fix R.7 Data Integrity
Modify the seed to include a user. Update the basePersisted object in R.7 so that
state.userProfile contains a valid uid , role , householdId , etc. This ensures that when
the seed hydrates, expectAppLoaded sees a non‑null UID and skips the forced injection.
Confirm session flag. Ensure that the init script sets sessionStorage.e2e-seeded before the
first navigation. If necessary, move the installPersistedSeed() call earlier (e.g. before
page.goto() in R.7) to guarantee the flag is available.
Task 3 – Complete Data for R.6 Injection
Replicate plannerSettings. The forced injection in expectAppLoaded currently inserts only a bare
userProfile , a zero‑balance account, and minimal planner settings. The Planner UI expects fields
such as startDate , startingBalance , income , and a full paySchedule similar to what R.7
seeds. Copy the relevant structure from the plannerSettings in R.7 (start date, income object,
semi‑monthly pay schedule) into the fallback state for R.6 so that “Week 1” calculations are possible.
Ensure an initial balance. For R.6, after creating the “Planner Bank” account with 1 000, confirm that
the account is reflected in the store with the correct balance , balanceCents ,
•
•
•
•
•
•
•
1
currentBalance , and currentBalanceCents . If the UI fails to update these fields due to
Firestore errors, add a helper to patch the store in the test after calling createAccount() .
Task 4 – State Dump Logging
Add debug output. Inside expectAppLoaded , add console.log('State dump:',
window.__cashflowStore?.getState?.()) at the point where it decides to inject the fallback
state (or chooses not to). Also log immediately after injection. This will record the exact Zustand state
at the moment of decision, allowing you to verify whether the userProfile, accounts, and planner
settings are present or missing.
Propagate logs to the terminal. Ensure the Playwright test prints these logs to stdout. Subscribe to
page.on('console', ...) at the start of each test so that browser console messages appear in
the terminal, as you did previously.
Once these investigative tasks are completed and the causes are identified, you can modify the test helpers
accordingly (e.g., adjust expectAppLoaded to respect sessionStorage.e2e-seeded , update the seed
objects, and enrich the fallback state) so that R.6 and R.7 pass reliably.
•
•
2