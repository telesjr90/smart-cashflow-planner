## Phase 0 – Analysis (App overview & ErrorBoundary)

**Files reviewed:** src/App.jsx, src/hooks/useCashflowData.js, src/store/useCashflowStore.js, src/pages/Home.jsx, src/pages/Bills.jsx, src/pages/Settings.jsx, src/components/AddExpenseModal.jsx, src/components/bills/BillFormSheet.jsx, src/components/ErrorBoundary.jsx

**Summary**
- App.jsx orchestrates login vs main tabs from the global cashflow store, seeds demo data, and gates cloud sync, but the ErrorBoundary is nested inside the same component it protects.
- useCashflowData.js manages Firestore auth, optimistic saves, and section-level versioning with offline/demo bypass; useCashflowStore.js is a passthrough to the underlying store.
- Home, Bills, Settings, AddExpenseModal, and BillFormSheet consume store data and Firestore actions; Bills respects offline state and local month filters but otherwise stays in the view layer.

**ErrorBoundary Usage**
- Implementation catches errors with getDerivedStateFromError/componentDidCatch; fallback is minimal text and it never resets without a remount.
- Boundary is applied inside App.jsx around the rendered branches, so errors thrown during App render (or inside providers in main.jsx) will bypass it and can still crash the root.

**Recommendations**
- Move ErrorBoundary to src/main.jsx to wrap ToastProvider, ConfirmProvider, and <App />, and optionally keep additional boundaries for high-risk sections if needed.
- Upgrade the fallback to include a user-facing recovery (reload/try again) and reset when navigation/tab changes (e.g., via a key or reset props).

## Phase 1.1 – Store persistence review (src/store/useCashflowStore.js)

**Summary**
- Zustand store is persisted via `persist` using `indexedDBStorage` under the key `cashflow-storage`; partialize stores accounts, transactions/expenses, recurringBills/bills, plannerSettings (startDate, startingBalance, income, paySchedule, billSharing, residualAccountId, mode), paidBills, categoryBudgets, goals, extraIncomes, and allocationRules.
- Merge logic normalizes legacy keys (expenses/transactions, bills/recurringBills) and applies plannerSettings back onto state while marking hydration complete.
- confirmedDiscretionary and billSharing-related confirmations are not persisted; userProfile is intentionally excluded.
- Storage is IndexedDB-backed (not plain localStorage), so environments without IndexedDB support would lose caching.

**Persistence Checklist**
- accounts – ✅ saved via partialize.accounts with normalizeList
- bills – ✅ saved as recurringBills (fallback to bills) in partialize
- expenses – ✅ saved as transactions (fallback to expenses) in partialize
- goals – ✅ saved via partialize.goals
- categoryBudgets – ✅ saved via partialize.categoryBudgets
- allocationRules – ✅ saved via partialize.allocationRules
- residualAccountId – ✅ saved inside plannerSettings
- income – ✅ saved inside plannerSettings
- paySchedule – ✅ saved inside plannerSettings
- billSharing – ✅ saved inside plannerSettings
- paidBills – ✅ saved via partialize.paidBills
- confirmedDiscretionary – ⚠️ not included in partialize/merge, so not persisted
- startDate – ✅ saved inside plannerSettings
- startingBalance – ✅ saved inside plannerSettings

**Recommendations**
- Persist `confirmedDiscretionary` to keep confirmations across reloads if they should survive refresh.
- Consider a lightweight fallback to localStorage or guarded no-op storage when IndexedDB is unavailable (SSR, private mode edge cases).
- Document the plannerSettings wrapper so future schema changes keep these fields in sync and avoid silent drops.

## Phase 1.2 – Data hook review (src/hooks/useCashflowData.js)

**Summary**
- Normal mode uses Firebase auth + Firestore subscription; on auth it seeds user doc, subscribes via onSnapshot, hydrates local state from server data with defaults, tracks section versions, and exposes save handlers.
- Demo path triggers when `agentDemo=1` in the URL; it short-circuits the auth effect, sets a mock user and in-memory data (`emptyUserData`), and marks loading false without touching the Zustand store or calling `setFullPlanData`.
- There is no explicit fallback for “Firebase unavailable”; network errors set `networkError` and default to `emptyUserData`, but still do not pull from the local store.

**Expected vs Actual Behavior**
- Normal mode: Auth listener + Firestore snapshot hydrate in-memory state; optimistic writes go to Firestore when online; no dependency on Zustand store. (Expected: OK for online mode.)
- Demo/fallback mode: Only handles `agentDemo` by seeding in-memory data; does not load from Zustand or call `setFullPlanData`; no path for Firebase-unavailable fallback. (Expected: should merge local store data + `emptyUserData` and push via `setFullPlanData`.)

**Verdict**
- Differences noted: Demo/fallback does not load/merge from the store or call `setFullPlanData`; no Firebase-unavailable fallback path.

**Issues / Improvements**
- Add a fallback branch when Firebase is unavailable (auth/db missing or failing) to pull existing Zustand data, merge with `emptyUserData`, and call `setFullPlanData`.
- Extend demo mode to do the same merge-and-setFullPlanData so the app reuses local data instead of a hardcoded empty slate.
- Guard critical Firebase calls with availability checks and a retry/backoff path; add tests for demo and offline/fallback hydration flows.

## Phase 1.3 – ErrorBoundary usage review (src/App.jsx or src/main.jsx)

**Root Structure**
- `src/main.jsx` renders `<React.StrictMode>` → wrapper `<div>` → `<ToastProvider>` → `<ConfirmProvider>` → `<App />`; no ErrorBoundary at this level.
- `src/App.jsx` renders `<ErrorBoundary>` around the login branch and another `<ErrorBoundary>` around the main app UI inside the component body.

**ErrorBoundary Usage**
- Needs adjustment: Boundary is only inside `App.jsx`; errors during App render or in providers above it (Toast/Confirm) will bypass the boundary and can crash the root.

**Recommended Structure**
- Wrap `<ToastProvider>` + `<ConfirmProvider>` + `<App />` with `<ErrorBoundary>` in `src/main.jsx`, and keep optional nested boundaries inside `App` for high-risk sections if desired (e.g., dashboards or charts) to contain localized failures.

## Phase 2.1 – DateInput component review (src/components/ui/DateInput.jsx)

**Summary**
- No `DateInput.jsx` exists in `src/components/ui`; only a generic `Input` component with date usage in forms.
- Because the component is missing, there is no standardized date field with icon/tap-target/error handling for mobile reuse.

**Feature Checklist**
- Uses <input type="date">: ⚠️ Not applicable; component absent.
- Calendar icon visible/clickable: ⚠️ Not applicable.
- Mobile tap target ~44px: ⚠️ Not applicable; no dedicated control.
- Props (value, onChange, min, max, label, error): ⚠️ Not applicable.
- Styling consistent with UI kit: ⚠️ Not applicable.
- Accessibility (labels, aria, error): ⚠️ Not applicable.

**Suggestions**
- Add a reusable `DateInput` component in `src/components/ui` that wraps `<input type="date">`, matches UI kit padding/rounded styles (44px height), includes a clickable calendar icon, and accepts `value`, `onChange`, `min`, `max`, `label`, `error`.
- Provide aria-label/aria-invalid, associate label via `<label>`, and surface errors below the field; ensure focus ring matches the existing `Input` component.

## Phase 2.2 – DateInput usage review (src/components/AddExpenseModal.jsx)

**Usage Summary**
- AddExpenseModal still uses the generic `Input` with `type="date"` for the date field; there is no DateInput component in the project, so no replacement occurred.

**Correctness Checklist**
- Replaced <Input type="date">: ⚠️ Not replaced; still using generic Input.
- Props wired (value, onChange, min, max, label, error): ⚠️ Only `label`, `type="date"`, `value`, and `onChange` are present; no min/max/error props wired.
- Validation intact: ⚠️ Minimal validation (just truthy checks for amount/description and online status) remains; no date-specific validation.

**Issues / Recommendations**
- Introduce the planned `DateInput` component and swap the date field to it, wiring `value`, `onChange`, and optional `min`/`max` constraints for allowable ranges.
- Add basic validation for date (e.g., required, not in the future/past if relevant) and show errors inline via the component’s `error` prop once available.
- Include a visible calendar icon/tap target to improve mobile UX once the DateInput exists.

## Phase 2.5.1 – AddTransactionModal refactor review (src/components/AddExpenseModal.jsx)

**Summary**
- The modal is still named/exported as `AddExpenseModal`, though it renders “Add Transaction” and supports both expense/income selection and account/category/date inputs.
- Behavior: collects amount, description, category, date, account, and type (expense/income), builds a transaction object, and calls `onSave`.

**Refactor Checklist**
- Name/export updated: ⚠️ Still `AddExpenseModal`, not `AddTransactionModal`.
- Terminology uses “transaction”: ⚠️ Mixed; header/button text say “Add Transaction”/“Save Transaction” but component name and some comments still use “expense”.
- Supports income + expense: ✅ Type toggle between expense and income persists in payload.
- No AddExpenseModal leftovers: ⚠️ Component file/name/export still reference AddExpenseModal; imports elsewhere also likely use this name.

**Verdict**
- Refactor has issues: naming/export remains `AddExpenseModal` despite transaction-oriented UI.

**Tweaks Suggested**
- Rename the file, component, and exports/imports to `AddTransactionModal` for consistency.
- Sweep for “expense”-only terminology in comments/props/handlers and make generic to transactions where applicable.
- Optional: add minimal validation messaging for required fields (amount, description, date) to reduce silent submission failures.

## Phase 2.5.1 – AddTransactionModal refactor review (src/components/AddTransactionModal.jsx)

**Summary**
- There is no `src/components/AddTransactionModal.jsx` file; the modal remains `AddExpenseModal` with transaction UI (income/expense toggle).

**Refactor Checklist**
- Name/export updated: ⚠️ Missing; still `AddExpenseModal` file/export.
- Terminology uses “transaction”: ⚠️ Mixed; UI says “Add Transaction,” but the component name is still expense-oriented.
- Supports income + expense: ✅ The existing modal supports both via type toggle.
- No AddExpenseModal leftovers: ⚠️ File and export are still named AddExpenseModal.

**Verdict**
- Refactor has issues: the rename to AddTransactionModal has not occurred; the intended file is missing.

**Tweaks Suggested**
- Create/rename the component/file/export to `AddTransactionModal`, and update imports accordingly.
- Normalize terminology to “transaction” throughout to avoid confusion with expense-only contexts.

## Phase 2.5.2 – Home modal import review (src/pages/Home.jsx)

**Usage Summary**
- Home does not import or render any transaction/expense modal directly. It exposes `onAddExpense` prop (called from the FAB) and delegates the modal responsibility to the parent (App handles AddExpenseModal).

**Import Checklist**
- Uses AddTransactionModal: ⚠️ No; no modal import in Home.
- No AddExpenseModal references: ✅ None in Home; modal integration is lifted to App.

**Notes**
- If the modal is intended to be used within Home, add the correct `AddTransactionModal` import and rendering; currently the parent handles it, so ensure the parent is updated to the new component name when renamed.

## Phase 2.5.3 – Settings modal import review (src/pages/Settings.jsx)

**Usage Summary**
- Settings does not import or render any transaction/expense modal; it relies on upstream handlers and forms within the page.

**Import Checklist**
- Correct modal component used: ⚠️ Not applicable; no modal here.
- No AddExpenseModal references: ✅ None present.
- Consistent with Home: ✅ Both pages defer modal responsibility to parent (App).

**Issues / Inconsistencies**
- None specific here; ensure App (or the owning parent) uses the renamed `AddTransactionModal` consistently when the rename is completed.

## Phase 3.1 – AccountSelect component review (src/components/ui/AccountSelect.jsx)

**Summary**
- `src/components/ui/AccountSelect.jsx` is missing, so there is no shared account selector to evaluate.

**Behavior Checklist**
- Props (accounts, value, onChange, label, disabled): ⚠️ Not applicable; component absent.
- >1 account → Select: ⚠️ Not applicable.
- 1 account → disabled Input: ⚠️ Not applicable.
- Consistent with UI kit: ⚠️ Not applicable.
- Accessibility (labels, aria): ⚠️ Not applicable.

**Verdict**
- Needs adjustments: component does not exist.

**Suggestions**
- Add a reusable `AccountSelect` that accepts `accounts`, `value`, `onChange`, `label`, and `disabled`, renders a UI kit `Select` when multiple accounts exist, and a disabled `Input` when only one account is available.
- Ensure label association/aria, consistent 44px tap target, and UI kit styling.

## Phase 3.2 – AccountSelect usage in AddTransactionModal (src/components/AddTransactionModal.jsx)

**Usage Summary**
- `AddTransactionModal` does not exist; the app still uses `AddExpenseModal`, which renders a custom button list for accounts and not AccountSelect.

**Integration Checklist**
- Imported correctly: ⚠️ No AddTransactionModal file; no AccountSelect import.
- value/onChange wired to accountId: ⚠️ Not applicable; state is managed via manual buttons.
- Old account selection removed: ⚠️ Legacy button-based selection remains in AddExpenseModal.

**Issues / Notes**
- Once `AddTransactionModal` is created/renamed, replace the manual account buttons with the shared `AccountSelect`, wiring `accountId` state to its value/onChange.

## Phase 3.2 – Account selection in AddTransactionModal (src/components/AddTransactionModal.jsx)

**Usage Summary**
- The modal keeps `accountId` in local state and renders a horizontal button list of accounts; clicking a button sets `accountId` and highlights the selection via styling.
- The selected account is stored in state and included in the transaction payload on save.

**Integration Checklist**
- Single, clear account selection UI: ✅ One button list inside the modal.
- State (e.g., accountId) wired correctly to value/onChange: ✅ Buttons set `accountId`; selected state reflects styling based on `accountId`.
- No redundant/legacy account selection logic: ✅ Only one mechanism present.
- Ready to be abstracted into a reusable UI component later: ⚠️ Uses manual buttons; would need swap to a shared component.

**Issues / Notes**
- Manual button list is inline; consider replacing with a reusable `AccountSelect` (Select for multiple accounts, disabled Input for single) to keep UX consistent across the app and make future changes easier.

## Phase 0 – Analysis (App overview & ErrorBoundary)

**Files reviewed:** src/App.jsx, src/hooks/useCashflowData.js, src/store/useCashflowStore.js, src/pages/Home.jsx, src/pages/Bills.jsx, src/pages/Settings.jsx, src/components/AddTransactionModal.jsx, src/components/bills/BillFormSheet.jsx, src/components/ErrorBoundary.jsx

**Summary**
- ErrorBoundary component correctly implements `getDerivedStateFromError`/`componentDidCatch`, but the fallback is minimal and it never resets without a remount.
- Boundary is only used inside `App.jsx` around the login and main branches; errors thrown during App render itself or inside providers rendered in `main.jsx` (Toast/Confirm) bypass it.
- No top-level guard in `main.jsx`, so a crash in providers or early App render can still take down the root and show a blank screen.

**ErrorBoundary Usage**
- Implemented as a class boundary with logging; lacks reset/retry UI and keeps the app in an error state until reload.
- Applied too low in the tree (inside `App.jsx`), so it does not protect provider setup or App’s own render logic.

**Recommendations**
- Wrap `ToastProvider`, `ConfirmProvider`, and `<App />` with `ErrorBoundary` in `src/main.jsx` for root-level protection, and keep optional nested boundaries for high-risk areas (e.g., charts/infographic pages).
- Enhance the fallback with a retry/reload control and a reset mechanism (keyed on route/tab changes) so users can recover without a full reload.

## Phase 1.1 – Store persistence review (src/store/useCashflowStore.js)

**Summary**
- Persistence uses `persist` with `indexedDBStorage` under key `cashflow-storage`; `partialize` saves normalized entities plus `plannerSettings` wrapper for core fields.
- Bills/expenses are saved under legacy-friendly keys (`recurringBills` and `transactions`) and merged back to `bills`/`expenses` on hydration; planner settings restore start date, balances, income, pay schedule, bill sharing, residual account, and mode.
- `confirmedDiscretionary` is not persisted; it resets on reload. Storage depends on IndexedDB availability; no localStorage fallback.

**Persistence Checklist**
- accounts – ✅ persisted via `partialize.accounts` (normalized list)
- bills – ✅ persisted as `recurringBills` fallback to `bills` in partialize/merge
- expenses – ✅ persisted as `transactions` fallback to `expenses` in partialize/merge
- goals – ✅ persisted via `partialize.goals`
- categoryBudgets – ✅ persisted via `partialize.categoryBudgets`
- allocationRules – ✅ persisted via `partialize.allocationRules`
- residualAccountId – ✅ persisted inside `plannerSettings`
- income – ✅ persisted inside `plannerSettings`
- paySchedule – ✅ persisted inside `plannerSettings`
- billSharing – ✅ persisted inside `plannerSettings`
- paidBills – ✅ persisted via `partialize.paidBills`
- confirmedDiscretionary – ⚠️ not included in partialize/merge, so not persisted
- startDate – ✅ persisted inside `plannerSettings`
- startingBalance – ✅ persisted inside `plannerSettings`

**Recommendations**
- Persist `confirmedDiscretionary` if those confirmations should survive reloads; otherwise document that they reset each session.
- Add a guarded fallback storage (e.g., localStorage/no-op) or error handling when IndexedDB is unavailable to avoid silent data loss in restricted environments.
- Consider a versioned schema note for the `plannerSettings` wrapper and the legacy `transactions`/`recurringBills` keys to keep future migrations predictable.

## Phase 1.2 – Data hook review (src/hooks/useCashflowData.js)

**Summary**
- Normal path: Auth listener via `onAuthStateChanged`; on login it seeds Firestore user doc, subscribes with `onSnapshot`, hydrates in-memory `myData`/`mySectionVersions`, and exposes save handlers; on logout it clears local hook state. No interaction with the Zustand store (`setFullPlanData` never called).
- Demo path: When `agentDemo=1`, it bypasses Firebase entirely, sets a mock user, `emptyUserData`, and section versions in local hook state, marks loading false, and exits. It does not pull from the persisted store or call `setFullPlanData`.
- Fallback for Firebase-unavailable is absent; errors set `networkError` and default to `emptyUserData`, but still without loading or merging store data.

**Expected vs Actual Behavior**
- Normal mode: Uses Firebase auth + Firestore subscription; hydrates hook state only. (Expected: OK for online mode, but does not propagate into Zustand.)
- Demo/fallback mode: Should merge local Zustand data + `emptyUserData` and call `setFullPlanData`; currently just seeds in-memory demo data and skips the store, and there is no Firebase-unavailable fallback.

**Verdict**
- Differences noted: Demo and Firebase-unavailable paths do not load from the store or call `setFullPlanData`; no true fallback when Firebase is missing.

**Issues / Improvements**
- Add a fallback branch (when `agentDemo` or Firebase unavailable/auth fails) to load persisted Zustand data, merge with `emptyUserData`, and call `setFullPlanData` so the UI uses existing local data.
- Guard Firebase calls with availability checks and handle offline/unavailable by short-circuiting to the fallback branch.
- Consider a reset mechanism for the boundary cases (e.g., retry/backoff when auth fails, explicit demo/fallback toggle tests).
- Tests to add: demo mode hydration uses store data; Firebase unavailable triggers fallback hydrate; version-conflict retries; offline saves no-op without throwing.

## Phase 1.3 – ErrorBoundary usage review (src/App.jsx or src/main.jsx)

**Root Structure**
- `src/main.jsx` renders `<React.StrictMode>` → `<div className="min-h-screen ...">` → `<ToastProvider>` → `<ConfirmProvider>` → `<App />`.
- `src/App.jsx` contains two `<ErrorBoundary>` wrappers: one around the login branch and one around the main app layout; no boundary above App or the providers.

**ErrorBoundary Usage**
- Needs adjustment: `main.jsx` does not wrap providers/App with `ErrorBoundary`, so crashes during App render or in Toast/Confirm providers bypass the boundary.
- Details: Boundaries inside `App` catch errors during child render after App has mounted, but anything thrown before that (or in providers) can still white-screen.

**Recommended Structure**
- Wrap `ToastProvider`, `ConfirmProvider`, and `<App />` with `ErrorBoundary` at the root (`main.jsx`) for global protection.
- Optionally keep local boundaries for high-risk sections (charts/infographics) to isolate partial failures while preserving the rest of the UI.

## Phase 2.1 – Date input pattern review (src/components/AddTransactionModal.jsx)

**Summary**
- Date is captured via the shared `Input` component with `type="date"` and a label; it uses the browser-native picker.
- No min/max constraints or validation beyond the form’s general required checks; errors are not surfaced inline.
- Styling depends on the `Input` component; likely consistent with the UI kit but the exact tap height isn’t explicitly enforced here.

**Feature Checklist**
- Clear date picker: ✅ Native `<input type="date">` with label.
- Mobile tap target ~44px: ⚠️ Uses the generic `Input` styles; height appears generous but not explicitly constrained/verified.
- Validation (min/max) correct: ⚠️ No min/max or validation for allowed ranges.
- Styling consistent with UI kit: ✅ Uses shared `Input` component styling.
- Accessibility (labels, aria, error): ⚠️ Label provided via `Input`, but no error messaging/aria-invalid for invalid/missing dates.

**Suggestions**
- Add optional `min`/`max` props (e.g., disallow future/past dates as appropriate) and surface validation feedback near the field.
- Ensure the date input’s height meets ~44px tap target on mobile; adjust the `Input` component if needed.
- Reusable DateInput recommended: Yes – add `DateInput` under `src/components/ui` that wraps the native date input, standardizes height, icon/tap area, `min`/`max`, `error`, `aria-invalid`, and forwards `label`, `value`, `onChange`, `disabled`.

## Phase 2.2 – Date input in AddTransactionModal (src/components/AddTransactionModal.jsx)

**Usage Summary**
- Date is selected via the shared `Input` component with `type="date"`; it initializes to today’s date (`new Date().toISOString().slice(0, 10)`).
- Local state `date` is updated on change and included in the transaction payload on submit.
- No explicit constraints (min/max) or inline validation; submit gating only checks presence of amount/description and online status.

**Correctness Checklist**
- Date control is obvious and usable: ✅ Native date input with label.
- State wiring correct: ✅ `date` state updates on change and is passed into the saved transaction object.
- Validation appropriate: ⚠️ No min/max or validation beyond required fields; invalid/missing date isn’t surfaced.

**Issues / Recommendations**
- Add optional min/max constraints if there are business rules (e.g., prevent far-future dates); surface errors inline.
- Consider centralizing date handling in a reusable `DateInput` (with error/aria support) to standardize UX and validation across modals/forms.

## Phase 2.5.1 – AddTransactionModal refactor review (src/components/AddTransactionModal.jsx)

**Summary**
- Modal collects transaction details (amount, description, category, date, account) with a type toggle for expense vs income; on save it builds a unified transaction object and calls `onSave`.
- UI labels and state refer to “transaction”; defaults favor expense but the type toggle switches to income.
- No obvious dependencies on the old AddExpenseModal semantics beyond defaulting type to `"expense"`.

**Refactor Checklist**
- Name/export updated: ✅ Component/file/export are `AddTransactionModal`.
- Terminology uses “transaction”: ✅ UI text and comments use transaction terminology.
- Supports income + expense: ✅ Type toggle drives `type` in payload.
- No unnecessary legacy coupling: ✅ Only minor default to `"expense"`; otherwise generic.

**Verdict**
- Refactor looks clean.

**Tweaks Suggested**
- Ensure parent imports/usages are fully migrated to `AddTransactionModal` and remove any lingering AddExpenseModal references to avoid confusion.

## Phase 2.5.2 – Home modal import review (src/pages/Home.jsx)

**Usage Summary**
- Home does not import or render any transaction modal directly; it exposes `onAddExpense` prop and triggers it from the floating action button to let the parent handle the modal.

**Import Checklist**
- Uses AddTransactionModal: ⚠️ Not used/imported here; modal is managed upstream.
- No AddExpenseModal references: ✅ None present.

**Notes**
- Ensure the parent component (`App` or equivalent) that owns `onAddExpense` is using `AddTransactionModal` to avoid legacy `AddExpenseModal` references.

## Phase 2.5.3 – Settings modal import review (src/pages/Settings.jsx)

**Usage Summary**
- Settings does not import or render any transaction/expense modal; it focuses on forms for profile, accounts, budgets, goals, etc.

**Import Checklist**
- Correct modal component(s) used: ✅ No transaction modal expected or used here.
- No AddExpenseModal references: ✅ None present.
- Consistent with Home: ✅ Both pages defer transaction modal handling to the parent.

**Issues / Inconsistencies**
- None noted; just ensure parent usage stays consistent with the renamed `AddTransactionModal`.

## Phase 3.1 – Account selection pattern review

**Current Patterns**
- AddTransactionModal: Horizontal button/chip list of accounts; clicking sets `accountId` and highlights the selection. No dropdown; good for few accounts, less scalable for many.
- BillFormSheet: Uses a `<Select>` dropdown labeled “Withdraw From”; falls back to default account logic if none is selected; more scalable for many accounts.

**Inconsistencies / Duplication**
- Different controls (chips vs select), different affordances (quick tap vs dropdown), and duplicated state/labeling logic.
- No shared component, so styling/ARIA/empty-state handling and account resolution are repeated.

**Proposed AccountSelect Component (for src/components/ui)**
- Props: `accounts` (array of {id, name, ...}), `value`, `onChange`, `label`, `disabled`, `variant` (“chips” | “select” | auto), `required`, `error`, `helperText`, `placeholder`, optional `resolveDefaultId` hook.
- Behavior: Render select when many accounts or when variant forces select; render chips for small sets; apply consistent focus/ARIA, error/required state; handle single-account case by showing a disabled input. Call `onChange` with the chosen `accountId`.
- Notes: Centralize empty-state messaging (“No accounts available”), enforce consistent height/tap targets, and reuse styling tokens from the UI kit.

## Phase 3.2 – Account selection in AddTransactionModal (src/components/AddTransactionModal.jsx)

**Usage Summary**
- Renders a horizontal button/chip list of accounts (when accounts are provided); clicking a button sets `accountId` state and highlights the selection.
- `accountId` is initialized from the first account (if any), updated via button clicks, and included in the transaction payload on submit.

**Integration Checklist**
- Single, clear account selection UI: ✅ One chip list for account choice; visible selection state.
- State (e.g., accountId) wired correctly to value/onChange: ✅ Button click updates `accountId`; selection reflected in styling; payload includes `accountId`.
- No redundant/legacy account selection logic: ✅ Only one pattern present; no dropdown or alternate path.
- Ready to be abstracted into a reusable UI component later: ✅ Self-contained state; could be swapped for a shared AccountSelect with minimal changes.

**Issues / Notes**
- Chip list works well for a few accounts but may not scale to many; consider migrating to a reusable AccountSelect that can switch between chips/select based on count and apply consistent accessibility/error states.

## Phase 3.3 – Account selection in BillFormSheet (src/components/bills/BillFormSheet.jsx)

**Usage Summary**
- Uses a `<Select>` labeled “Withdraw From” when accounts are provided; options list account names/ids. Selection is stored in local `draft.accountId` and submitted via `onSave`.
- Draft initializes `accountId` from the bill or the first account; updates via select `onChange`.

**Integration Checklist**
- Account selection UI is clear: ✅ Standard select with label and options.
- Selected account flows into bill data: ✅ `draft.accountId` is set on change and passed in the saved bill object.
- Pattern consistent with AddTransactionModal: ⚠️ Different control (dropdown vs chips); functionally consistent but UX differs.

**Issues / Notes**
- UX differs from the chip pattern in AddTransactionModal; consider unifying via a shared AccountSelect that can render as select for larger lists or chips for small sets, with consistent styling and accessibility/error handling.

## Phase 4.1 – Bills logic review (src/pages/Bills.jsx)

**Summary**
- `budgetOptions` is built from `categoryBudgets` entries (label/scope/owner) and filtered by role; no "Uncategorized" fallback when budgets are empty.
- `handleSaveBill` cleans amount/dueDay, resolves accountId, builds new/updated bill, calls `handleUpdateBills`, and resets state; no explicit validation, no toast messaging, and no try/catch around the save (only try/finally for isSaving).

**Behavior Checklist**
- "Uncategorized" fallback in budgetOptions: ⚠️ Missing; empty budgets yield an empty list/defaultCategoryKey.
- handleSaveBill validates name: ⚠️ No validation; falls back to "New bill".
- handleSaveBill validates amount > 0: ⚠️ No; accepts 0/NaN as 0.
- try/catch around save: ⚠️ No catch; only try/finally for isSaving.
- useToast success/error used: ⚠️ Not used.
- Correct store update function called: ✅ Uses `handleUpdateBills`.

**Suggestions**
- Add "Uncategorized" budget option when budgets are empty to avoid blank category lists.
- Validate required fields (name non-empty, amount > 0) with inline errors or toasts; block save on invalid input.
- Wrap save logic in try/catch and surface errors via `useToast`; optionally show success confirmation.

## Phase 4.2 – Bill form UI review (src/components/bills/BillFormSheet.jsx)

**UI Summary**
- Budget field is a `<Select>` labeled “Category” with options derived from `budgetOptions`; when empty, it shows “No categories available” and defaults to an empty value. No helper text about fallback.
- Budget selection is optional; no explicit default to “Uncategorized” or similar in the UI.

**Behavior Checklist**
- Helper text present: ⚠️ None about uncategorized fallback.
- Budget can be optional / defaults to Uncategorized: ⚠️ Optional but defaults to empty; no “Uncategorized” option provided by default.

**Verdict**
- Needs adjustments: missing helper copy and a clear fallback/default option.

**Suggestions**
- Add helper text like “Bills will be saved as Uncategorized if no budget is selected.”
- Provide an explicit “Uncategorized” option as the default when no budget is chosen, especially when `budgetOptions` is empty.

## Phase 5 – Goals form review (src/components/settings/GoalsForm.jsx)

**Summary**
- Empty state shows “No goals defined yet.” and the “Add goal” button remains visible.
- Adding a goal relies on parent-provided `onAddGoal`; no default object is created inside this component.
- “Save goals” button appears only when `dirtyGoals` is true and triggers `onSaveGoals`.
- No toasts or inline feedback are handled here; success/failure signaling is delegated to the parent.

**Behavior Checklist**
- Clear empty state message: ✅ Shown when `visibleGoals` is empty.
- "+ Add Goal" visible on empty: ✅ Always visible in header.
- Default goal object on add: ⚠️ Created upstream; this component doesn’t insert a default object itself.
- "Save Goals" only when dirtyGoals: ✅ Only renders when `dirtyGoals` is true.
- Saves to store correctly: ✅ Delegated to parent via `onSaveGoals`.
- Toast on success/failure: ⚠️ Not handled here.

**Suggestions**
- Ensure `onAddGoal` inserts a fully initialized default goal (id, name, targetAmount, perMonth, owner/scope) to avoid partial/undefined fields.
- Provide toast feedback in the parent for save success/failure, and consider inline validation for required fields (name/target).

## Phase 6.1 – Input mobile UX review (src/components/ui/Input.jsx)

**Summary**
- Inputs use a shared component with size variants: `sm` (h-10, text-caption) and `md` (h-11, text-body), rounded corners, and padding adjustments for icons/prefixes.
- Vertical padding/height is moderate (h-11 ≈ 44px) on `md`; `sm` is tighter (~40px). Font size for `md` is text-body (base), helping avoid iOS zoom; `sm` uses text-caption (small).

**Mobile UX Checklist**
- Vertical padding comfortable: ✅ `md` height (~44px) is comfortable; `sm` is tighter and may be small on mobile.
- text-base on mobile: ✅ For `md` (text-body). ⚠️ `sm` uses text-caption (small) which could trigger zoom in some cases.
- Consistent with UI kit: ✅ Uses shared styling, rounded-2xl, focus ring consistent with kit.

**Verdict**
- Comfortable for `md`; `sm` could be better on mobile.

**Suggestions**
- Prefer `size="md"` for mobile-critical inputs; consider bumping `sm` font to at least text-body on mobile to avoid zoom.
- Optionally add a `lg` size for more generous tap targets or ensure `sm` is only used for compact, non-text-entry controls.

## Phase 6.2 – Home FAB positioning review (src/pages/Home.jsx)

**Summary**
- FAB is a `Button` fixed at `bottom-24 right-4` with size `h-14 w-14` and rounded-pill styling, floating above content.
- Positioning and size make it prominent and likely above the bottom nav area.

**Overlap Risk**
- No: `bottom-24` keeps it well above typical bottom navigation height, reducing chance of covering nav icons on mobile.

**Suggestions**
- Ensure bottom nav spacing is consistent; if nav height changes, consider tying FAB offset to a shared spacing token or CSS variable for alignment across layouts.

## Phase 6.3 – Transaction modal mobile layout review (src/components/AddTransactionModal.jsx)

**Summary**
- Modal is a fixed overlay (`fixed inset-0 z-50 flex items-end sm:items-center`) with a semi-opaque backdrop and a card (`max-w-md`, rounded) that slides up from the bottom on mobile. On small screens it’s bottom-sheet style, not full-height; content is not explicitly scrollable.
- The form uses regular flow layout with grids; no `overflow-y-auto` on the modal container or form, and no body scroll locking shown here.

**Behavior Checklist**
- Full-height / sheet behavior on small screens: ⚠️ Bottom sheet presentation but not full-height (`max-h`/`h-screen` not set).
- Inner content scrollable: ⚠️ No explicit `overflow-y-auto`; long content could overflow viewport.
- Body scroll locked when open: ⚠️ Not handled in this component.

**Suggestions**
- Add `max-h-[100vh]`/`h-[100dvh]` with `overflow-y-auto` to the modal content to ensure scrolling on small screens and prevent cutoff.
- Ensure body scroll is locked while open (via parent/modal utility) to avoid background scroll bleed-through.
- Consider adding top padding/margin for small screens so the header stays accessible on devices with very small viewports.

## Phase 7 – Select component accessibility review (src/components/ui/Select.jsx)

**Summary**
- Select wraps a native `<select>` inside a `<label>` with an optional text label; uses size/variant styles and a chevron icon. Error text is shown when `error` prop is set. `aria-invalid` derives from prop or error.

**A11y Checklist**
- Correct labeling (aria-label/aria-labelledby): ⚠️ Relies on wrapping label; no `id`/`htmlFor`, so if `label` is omitted, no accessible name unless `aria-label` is passed manually.
- Keyboard focus and navigation: ✅ Native select with focus-visible ring; keyboard navigation works by default.
- Label-control connection: ⚠️ Implicit via wrapping label; lacks explicit `id`/`htmlFor` for cases where label text isn’t rendered.

**Issues / Gaps**
- No automatic `id` generation; accessible name missing when `label` is not provided and `aria-label` isn’t set.
- Error text isn’t explicitly linked via `aria-describedby`.
- No support for `aria-labelledby` override; relies solely on label text or manual aria-label.

**Suggested Improvements**
- Generate/link an `id` for the select and use `htmlFor` when `label` is present; support `aria-label`/`aria-labelledby` props and ensure at least one accessible name path is required.
- Attach error/helper text via `aria-describedby` when present.
- Consider exposing a `required` prop that sets `aria-required` and optional visual indicator for required fields.

## Phase 7.1 – Toast system review (src/components/ui/toast/ToastProvider.jsx, src/components/ui/toast/useToast.js)

**Architecture & API**
- How toasts are triggered (useToast): Components call `showToast({ type, message, timeout })` from the hook; `dismissToast` maps to `removeToast`.
- How ToastProvider renders/manages toasts: Maintains an array in state, appends toasts with ids, auto-removes via timeout, renders a fixed container at bottom-center with mapped `ToastItem` entries.

**Variants & Styling**
- Available variants (success/error/etc.): success, error, warning, info; each maps to icon/color. Info uses dark background/text; others use light bg with colored border/icon.
- Visual alignment with design system (colors, radius, shadows): Rounded-3xl, border, shadow-soft; colors use surface/success/danger/warning tokens—mostly aligned, though info variant flips to dark mode styling.

**Mobile Behavior**
- Placement and spacing: Fixed bottom-center (`bottom-6`), max-w-sm, pointer-events none on container; pointer-events auto on items. Could overlap bottom nav if present; spacing is modest.
- Stacking behavior: Column stack with gap-3; timeouts remove individually.

**Accessibility**
- aria-live / roles: Container has `role="status"` + `aria-live="polite"`/`aria-atomic`; each toast has `role="alert"`. Dismiss button has aria-label.
- Keyboard/focus considerations: No focus management to move focus to toast; relies on screen reader announcements. Pointer-events none on container but buttons are clickable.

**Issues / Improvements**
- Add an `aria-label`/`aria-labelledby` option to `showToast` for clarity, or include title support; consider `role="status"` on non-error toasts and `role="alert"` only on errors.
- Add body/description support and optional action button for richer toasts.
- Consider offsetting for bottom nav on mobile (e.g., larger bottom padding or safe-area insets).
- Offer a queue limit or replace-previous option to prevent overflow on rapid toasts.
- Consider focus/announcement: allow optional auto-focus on action/dismiss for critical toasts or ensure polite/live settings vary by severity.

## Phase 7.2 – ConfirmModal review (src/components/ui/modals/ConfirmModal.jsx)

**API & Usage**
- Props and events: `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`.
- Typical usage pattern (how it’s opened/closed): Parent controls `open`, renders modal; clicking backdrop, cancel button, Escape, or confirm/cancel handlers invokes callbacks; focus starts on cancel button when opened.

**Visual Design**
- Alignment with UI kit (radius, spacing, typography): Rounded-3xl card, soft shadow, border, padded content; primary button uses primary color, secondary is outlined/neutral—consistent with kit.
- Primary vs secondary action clarity: Clear primary (filled) vs secondary (outlined); side-by-side layout.

**Mobile Behavior**
- Layout on small screens: Centered modal with `max-w-sm`, padding; no explicit height/scroll handling, so long messages could overflow viewport.
- Scroll behavior (content cut off or scrollable): No `overflow` handling; potential cutoff on very small screens.

**Accessibility**
- Role and aria attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby` wired via generated ids.
- Focus management: Initial focus to cancel button; manual Tab trapping across two buttons; Escape closes via onCancel; backdrop click closes.
- Escape / backdrop click handling: Both trigger onCancel.

**Strengths**
- Simple API with clear props for text/actions; consistent styling and focus ring; Escape/backdrop support; focus trap for action buttons; labeled dialog semantics present.

**Issues / Improvements**
- Add `aria-label` fallback or prevent empty title/message to avoid unlabeled dialog; consider `role="alertdialog"` for destructive confirms.
- Add `max-h-[100vh]/overflow-y-auto` to content to prevent cutoff on small screens; consider a mobile sheet variant.
- Improve focus trap to include the dialog and any future focusable elements (not just two buttons) and return focus to trigger on close.
- Provide optional severity variant to style confirm button (e.g., danger for destructive) and adjust copy emphasis.

## Phase 7.3 – Toast + ConfirmModal integration review

**Flows Reviewed**
- Expenses delete flow (`src/pages/Expenses.jsx`) using `useConfirm` for deletion; no toast usage observed elsewhere.

**Integration Pattern Evaluation**
- ConfirmModal shows before destructive actions: ✅ Confirm dialog appears before deleting a transaction.
- Success toast after confirm: ⚠️ No toast shown on successful delete.
- Error toast on failure: ⚠️ No error handling/toast around deletes.
- Modal closes at the correct moment: ✅ Modal resolves/ closes before delete proceeds.
- Visual consistency of toasts (colors/positions): ⚠️ Not exercised in flows.
- Prevents double submit / race conditions: ⚠️ No explicit disabled state during delete; rapid double confirms could duplicate work (though delete is idempotent in current logic).

**UX Coherence Across Pages**
- Deletes in Expenses (and similar patterns in Bills) rely solely on confirm dialogs; no feedback to the user after action completes or fails.

**Edge Cases**
- Failed deletes are not caught/toasted; background errors would be silent.
- ConfirmModal does not disable buttons during async deletes, so rapid re-trigger is possible.

**Strengths**
- Clear confirm prompt before destructive action; modal closes cleanly and focus is managed.

**Issues / Risks**
- Lack of success/error toasts leaves users without feedback post-confirm.
- No error handling around delete persistence; failures are silent.
- No use of toast variants for destructive actions, so severity is not differentiated.

**Recommendations**
- Establish a standard pattern: on confirm, perform async delete inside try/catch; on success, show a success toast; on error, show an error toast and keep UI consistent.
- Disable confirm button or guard against multiple submissions while the delete is in flight.
- Add descriptive toast copy for destructive actions (“Transaction deleted” / “Failed to delete transaction”) and ensure error toasts use the danger variant.

## Phase 7.4 – Destructive Flow Checklist Review

**Flows Reviewed**
- Delete transaction (src/pages/Expenses.jsx)
- Delete bill (src/pages/Bills.jsx)
- Delete account (src/components/settings/AccountsForm.jsx)
- Delete allocation rule (src/components/settings/AllocationRulesForm.jsx)

**Checklist**
- Danger button visually distinct: ⚠️ Delete buttons are plain text with red tint; not always using a danger-styled button.
- ConfirmModal always shown before delete: ⚠️ Expenses uses confirm; Bills/Accounts/AllocationRules do not (inline delete without confirmation).
- ConfirmModal wording specific: ⚠️ Expenses prompt is generic; other flows lack confirmation.
- try/catch around destructive action: ⚠️ Not used; deletes are optimistic without error handling.
- Success toast consistent: ⚠️ No success toasts after deletes.
- Error toast consistent: ⚠️ No error toasts on failure.
- Modal closes at correct time: ✅ In Expenses (only flow with modal).
- Double-submit prevention: ⚠️ No disabled state; repeated clicks possible.
- UI updates correctly after delete: ✅ Local state updates immediately in reviewed flows.

**Cross-Screen Consistency**
- Inconsistent: Expenses uses confirm; Bills/Accounts/AllocationRules do not. No toasts across any destructive flow.

**Issues Identified**
- Missing confirmations for several destructive actions (Bills, Accounts, Allocation Rules).
- No success/error feedback via toasts; failures would be silent.
- Delete actions not styled distinctly as destructive, reducing caution signals.
- No guards against double submissions during async work.

**Recommended Standard Pattern**
- Use ConfirmModal for all destructive actions with specific, contextual copy (e.g., “Delete bill ‘Rent’?”) and danger-styled confirm.
- Wrap deletes in try/catch; on success, show a success toast; on error, show an error toast; update UI optimistically with rollback on error if needed.
- Disable confirm/danger buttons while the delete is in flight to prevent double submissions.
- Ensure toasts use consistent placement/variant (danger for errors, success for completions) and that the modal closes before the toast shows.

## Phase 7.5 – Design Consistency Spec Review

**Components Reviewed**
- Button, Input, Select, Badge, Card, StatCard, TransactionRow, ToastProvider/useToast, ConfirmModal, ThemeToggle, BottomNav.

**Consistency Scorecard**
- Buttons: rounded-pill; sizes h-9/11/12/icon; focus ring primary; tokens used for primary/secondary/outline/ghost/danger; text/title-l on lg; ✅ mostly consistent though lg uses text-title-l (large).
- Inputs: rounded-2xl; sizes h-10/11; text-caption/body; focus ring primary; uses surface tokens; ✅ consistent with form kit; ⚠️ smaller font on `sm`.
- Select: rounded-2xl; h-10/11; uses surface tokens and focus ring primary; ✅ similar to Input; ⚠️ missing explicit id/for for label.
- Badge: rounded-pill; text-tiny; surface/semantic tokens; role=status; ✅ consistent.
- Card: rounded-2xl/3xl; variants elevated/flat/outline; shadow-soft/glow hover; ✅ consistent surfaces.
- StatCard: reuses Card; highlight variant flips to primary-600 bg; ✅ consistent but highlight diverges with solid primary.
- TransactionRow: rounded-3xl, shadow-soft, border surface; uses surface/danger/success tokens; focus ring primary when clickable; ✅ aligned.
- ToastProvider + useToast: rounded-3xl, shadow-soft, borders; variants use surface/semantic tokens; info uses dark surface-900; ✅ mostly consistent; ⚠️ placement may overlap nav.
- ConfirmModal: rounded-3xl, shadow-soft, border; primary/neutral buttons; ✅ aligned; ⚠️ no danger variant for destructive.
- ThemeToggle: rounded-pill icon button; focus ring primary; ✅ aligned.
- BottomNav: rounded-top-3xl container with shadow; uses primary for active; ✅ consistent with tokens; FAB uses rounded-full primary/white.

**Identified Inconsistencies**
- Mixed radius: buttons rounded-pill vs inputs/select rounded-2xl vs cards rounded-3xl; need clear token mapping.
- Font size mismatch: Button `lg` uses text-title-l (large), Inputs `sm` use text-caption (small); could misalign.
- Toast info variant uses dark bg while others use light; visual style diverges.
- ConfirmModal confirm button always primary, not danger for destructive flows.
- Label/id wiring gaps in Select; accessibility inconsistency.
- BottomNav FAB and Home FAB offset not tied to a shared spacing token; potential overlap variance.

**Proposed Design Consistency Spec**
- Radius tokens: pill (for buttons/chips), 2xl for inputs/selects/badges, 3xl for cards/modals/toasts/sheets; full for fabs.
- Spacing rules: inputs/selects h-11 text-body as default; buttons md h-11 text-body; small variants not below text-sm; padding x-4 on md controls.
- Shadow hierarchy: none (flat), shadow-soft for cards/modals/toasts/buttons primary/danger, shadow-glow for hover/primary emphasis; avoid ad-hoc shadows.
- Typography scale: labels text-tiny uppercase semibold; body text-body; captions text-caption; buttons use text-body (md) and text-sm (sm); avoid title sizes in buttons.
- Icon sizes: default 18–20px; FAB icons 24–28px; keep consistent stroke widths (2–2.5).
- Interaction + animation: focus ring primary-500 with offset; hover translate/shadow for interactive cards; modal/toast slide/zoom 200–300ms; consistent easing.
- Toast + Modal surface rules: light surfaces by default (`bg-surface-100`, borders surface-200/20–60); danger/success/warning text/icon tokens; toasts stacked bottom with safe-area offset; modals rounded-3xl with `max-h` + scroll.
- Danger/destructive color spec: use danger variant for destructive buttons/toasts; ConfirmModal for destructive actions should use danger-styled confirm and alertdialog role; danger badges/indicators use danger-500/10 backgrounds with danger text.

## Phase 7 – Select component accessibility review (src/components/ui/Select.jsx)

**Summary**
- Select wraps a native `<select>` inside a `<label>` with an optional text label; uses size/variant styles and a chevron icon. Error text is shown when `error` prop is set. `aria-invalid` derives from prop or error.

**A11y Checklist**
- Correct labeling (aria-label/aria-labelledby): ⚠️ Relies on wrapping label; no `id`/`htmlFor`, so if `label` is omitted, no accessible name unless `aria-label` is passed manually.
- Keyboard focus and navigation: ✅ Native select with focus-visible ring; keyboard navigation works by default.
- Label-control connection: ⚠️ Implicit via wrapping label; lacks explicit `id`/`htmlFor` for cases where label text isn’t rendered.

**Issues / Gaps**
- No automatic `id` generation; accessible name missing when `label` is not provided and `aria-label` isn’t set.
- Error text isn’t explicitly linked via `aria-describedby`.
- No support for `aria-labelledby` override; relies solely on label text or manual aria-label.

**Suggested Improvements**
- Generate/link an `id` for the select and use `htmlFor` when `label` is present; support `aria-label`/`aria-labelledby` props and ensure at least one accessible name path is required.
- Attach error/helper text via `aria-describedby` when present.
- Consider exposing a `required` prop that sets `aria-required` and optional visual indicator for required fields.
