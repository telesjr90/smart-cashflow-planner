# Production Readiness

Last audit: agentDemo, Playwright headless (`npm run audit:ui`), visual baselines enforced (`scripts/audit-headless.spec.js-snapshots/`), artifacts in `artifacts/audit/`.

## Build & Deploy
- Build: `npm install && npm run build`
- Preview: `npm run preview`
- CI: recommended `npm run ci` (build + vitest + audit + lhci)
- Node: 20.x LTS
- Env (frontend): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Env (admin/scripts): `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` or Workload Identity

## Security & Data
- Firestore rules: default deny; allows user doc read/write for owner, read for same-household. File: `firestore.rules`.
- No service account keys committed; use env-based credentials.
- Offline persistence enabled; plan to migrate to `FirestoreSettings.cache` when upgrading Firebase to silence deprecation warning.
- Suggest App Check + auth domain allowlist for production.

## Performance & Lighthouse
- LH config: `lighthouse.config.js`
- Targets: Perf ≥0.90, A11y ≥0.90, Best Practices ≥0.90, PWA ≥0.70
- Run: `npm run lhci` (after `npm run build && npm run preview`)
- Serve static build with compression + HTTP/2; enable long-term caching for assets.

## Testing
- Unit/Integration: `npm test` (vitest with scoped include)
- UI audit (headless flows, visual diffs enforced): `npm run audit:ui`
- Update visual baselines when UI intentionally changes: `npm run audit:ui:update`
- E2E/visual (Playwright) available via dedicated scripts if enabled.

## UI/UX Audit (latest)
- Navigation: Home, Bills, Planner, Settings ✅.
- Bills: add x2, edit, change account, toggle paid, bulk paid/unpaid ✅.
- Expenses: add via modal + FAB ✅.
- Planner: chart visible, mode toggle ✅.
- Settings: income/schedule save, accounts add/save, goals add/save, budgets add/save, profile role/household fill ✅.
- Screenshots: `artifacts/audit/*.png`; console logs: `artifacts/audit/console.json` (Firestore cache warning only).
- Visual baselines: stored in `scripts/audit-headless.spec.js-snapshots/`; diffs enforced in audit.

## Offline UX
- Offline banner and disabled actions on Bills/Settings; consider extending to other forms if needed.

## Observability
- Add error logging (Sentry or similar) for production; consider Firebase Performance Monitoring if using mobile shells.

## Operational Checks
- Verify Firestore indexes for any added compound queries.
- Set quota/billing alerts (Firestore/Functions).
- Backups: enable scheduled Firestore exports if needed.

## Rollout
- Deploy to preview/staging, run `npm run ci` (build + tests + audit), then `npm run lhci` before promotion.
- Keep feature flags for risky changes.
