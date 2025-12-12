## TD.2 – Config & stray files review

**Files checked**
- tailwind.config.js
- tailwind.config.json
- postcss.config.js
- postcss.config.json
- src/components/TransactionRow.md
- src/components/ui/TransactionRow.jsx

**Findings**
- `tailwind.config.js` holds the active theme/content settings; `tailwind.config.json` is a stale copy with default config in a .json file (using JS syntax) and is not referenced anywhere.
- `postcss.config.js` is the standard PostCSS setup used by Vite; `postcss.config.json` is a duplicate with the same JS content but wrong extension and no references.
- `TransactionRow.jsx` is the component imported in `src/pages/Expenses.jsx`; `TransactionRow.md` is an old React snippet (even includes an odd separator character) and is not imported anywhere.

**Canonical files**
- Tailwind config: `tailwind.config.js`
- PostCSS config: `postcss.config.js`
- TransactionRow component: `src/components/ui/TransactionRow.jsx`

**Cleanup Actions**
- Delete `tailwind.config.json` to avoid config drift/confusion.
- Delete `postcss.config.json` for the same reason.
- Delete `src/components/TransactionRow.md` (or move content into a real doc if needed) so only the `.jsx` component remains.

## TD.3 – Cashflow test & naming review

**Summary**
- Vitest excludes `tests/cashflowEnginge.test.mjs`; the only cashflow tests live in that misnamed file and in `scripts/testCashflowEngine.mjs`, both of which import a non-existent `src/lib/cashflowEngine.js`, so nothing runs under `npm test`.
- The real engine exports live under `src/lib/cashflow/projectCashflow.js` and are re-exported via `src/lib/cashflow/index.js`, but no tests point to those paths.

**Misspelled References (cashflowEnginge)**
- `tests/cashflowEnginge.test.mjs` (filename, and import points to `../src/lib/cashflowEngine.js`).
- `vitest.config.js` excludes `tests/cashflowEnginge.test.mjs` by name.
- `structure.md`/`project_structure.md` lists the misspelled test file.

**Intended Module Structure**
- Canonical engine exports: `src/lib/cashflow/projectCashflow.js` (engine implementation) and `src/lib/cashflow/index.js` (public exports such as `projectCashflow`, `getDateForMonthIndex`, `toCents`, etc.).
- There is no `src/lib/cashflowEngine.js`; tests should import from `src/lib/cashflow/projectCashflow.js` or `src/lib/cashflow/index.js`.

**Recommended Changes**
- File renames / import targets: rename `tests/cashflowEnginge.test.mjs` → `tests/cashflowEngine.test.mjs` (or move into `tests/unit/`), update imports in both this test and `scripts/testCashflowEngine.mjs` to use `../src/lib/cashflow/projectCashflow.js` (or `../src/lib/cashflow/index.js`), and fix any internal name references (`getDateForMonthIndex`, `projectCashflow`, etc.).
- Test config adjustments: remove the exclusion in `vitest.config.js` and let the renamed test fall under the existing include globs (or explicitly include it); ensure the test path matches the include pattern (e.g., place in `tests/unit/cashflowEngine.test.mjs`).

## TD.4 – Unused dependencies & one-off scripts

**Dependency Usage**
- idb-keyval: Unused – no imports found anywhere in the codebase.
- framer-motion: Unused – no imports found anywhere in the codebase.

**Script Review**
- scripts/markBillsPaidUpTo2025-11-14.js: One-off Firestore maintenance script; hard-coded target emails (two user accounts), date window (November 2025 up to day 14), and writes paidBills markers. Intended to be run manually with admin creds.

**Recommended Cleanup**
- Remove unused dependencies `idb-keyval` and `framer-motion` from `package.json` (and lockfile) to slim installs.
- For the one-off script: either delete it after confirming the maintenance is done, or move it to an ops/archive folder with a short README noting its hard-coded emails/date scope so it’s not confused with reusable tooling.

## TD.5 – Repo hygiene review

**Generated Directories Tracked**
- test-results/ is tracked (contains .last-run.json). dist/ and node_modules/ are present locally but not tracked.

**.gitignore Status**
- dist/: Ignored
- node_modules/: Ignored
- test-results/: Not ignored

**Cleanup Plan**
- Add test-results/ to .gitignore and remove the tracked directory (delete the folder and commit the removal).
- Keep dist/ and node_modules/ untracked; optionally clean local builds before commits.
