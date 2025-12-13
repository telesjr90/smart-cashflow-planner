# Smart Cashflow Planner – CTA & Action Patterns
Use these button patterns to keep actions consistent and avoid ad-hoc styling.

## Button variants
- Primary: `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600`
- Secondary: `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-100 text-surface-900 border border-surface-200 hover:bg-surface-200 font-semibold`
- Destructive: `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-danger-500 hover:bg-danger-600 text-white font-semibold`
- Ghost: `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-transparent text-surface-900 border border-transparent hover:bg-surface-50`
- Icon-only: `inline-flex items-center justify-center p-2 rounded-lg text-surface-900 hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600` (always provide `aria-label`)

## Disabled vs offline behavior
- Disabled: apply `aria-disabled="true"`, `opacity-60 cursor-not-allowed`, keep labels visible; if disabled for a reason (missing data, validation), show inline helper or tooltip explaining why.
- Offline: prefer actionable messaging—swap label to “Offline” or “Retry” and keep `cursor-not-allowed` + tooltip “Reconnect to proceed”; avoid silent no-ops.
- Loading: show spinner + `aria-busy="true"` and disable the button using the disabled treatment above.

## No Inert Buttons
- Every visible button must either perform its action or explain why it cannot via inline helper text or tooltip. Do not render non-functional buttons without feedback.***
