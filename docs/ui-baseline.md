# Smart Cashflow Planner – UI Baseline
Baseline standards to curb ad-hoc styling per the Smart Cashflow Planner — Implementation Plan. Use these tokens and patterns before adding any new Tailwind utilities or inline styles.

## Spacing tokens (Tailwind scale)
- Use Tailwind spacing tokens only: `0, 0.5 (2px), 1 (4px), 1.5 (6px), 2 (8px), 2.5 (10px), 3 (12px), 3.5 (14px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)`.
- Vertical stacking: `space-y-3` for tight lists, `space-y-4` default, `space-y-6` for page sections.
- Horizontal gaps: `gap-3` compact, `gap-4` default, `gap-6` for cards/forms; pair with `px-4`/`px-6` padding.
- Page padding: `px-6 md:px-8 lg:px-12` with `py-6`/`py-8`; cards use `p-4 md:p-6`, inline chips use `px-3 py-1`.

## Typography hierarchy
- Font family: `font-sans` (Inter from theme). Avoid ad-hoc font utilities.
- H1: `text-title-2xl font-bold tracking-tight` for page titles.
- H2: `text-title-xl font-semibold` for primary section headers.
- H3: `text-title-l font-semibold` for sub-sections or card titles.
- H4: `text-base font-semibold` for inline section labels within cards/forms.
- Body: `text-body text-surface-900` for default copy; `text-body text-surface-500` for helper text.
- Small/eyebrow: `text-caption font-medium text-surface-500`; uppercase micro-labels use `text-tiny`.

## Border radius and shadow standards
- Radii: `rounded-lg` for controls, `rounded-xl` for compact surfaces, `rounded-2xl` default card/modal radius, `rounded-3xl` for hero/major panels, `rounded-pill` for chips/pills.
- Shadows: use theme shadows only—`shadow-sm` for subtle inputs, `shadow-soft` for cards and sheets, `shadow-glow` only for focus/feature emphasis. Do not inline `box-shadow`.
- Borders: prefer `border border-surface-100` on light surfaces; `border-none` reserved for elevated cards already using `shadow-soft`.

## Approved Tailwind patterns (no ad-hoc styling)
- Page shell: `max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8 space-y-6 bg-surface-50`.
- Card/sheet: `bg-surface-50 border border-surface-100 rounded-2xl shadow-soft p-4 md:p-6 space-y-4`.
- Section header row: `flex items-center justify-between gap-3` with H2/H3 + actions using `space-x-2`.
- Form grid: `grid grid-cols-1 md:grid-cols-2 gap-4` (upgrade to `gap-6` for dense sections); label/helper text use the Body/Small styles above.
- Buttons: primary `bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold`, secondary `bg-surface-100 text-surface-900 border border-surface-200 px-4 py-2 rounded-lg`, destructive `bg-danger-500 text-white`.
- Chips/pills: `inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-100 text-body` with optional `border border-surface-200`.
- Lists/tables: `divide-y divide-surface-200` with row padding `py-3 px-4` and `hover:bg-surface-50`.
- Modals/drawers: `rounded-2xl md:rounded-3xl shadow-soft md:p-6 p-4 bg-surface-50 space-y-4`; backdrop handled via existing modal component tokens.
- Charts/infographics containers: reuse the Card pattern with `gap-4` and only `text-caption` for metric labels; avoid inline positioning utilities unless already approved.***
