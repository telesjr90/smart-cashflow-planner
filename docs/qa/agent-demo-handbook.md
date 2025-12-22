## Agent Mode Browser Runbook (/?agentDemo=1)

### Before you start

* Open: `https://cashflow-a1c11.web.app/?agentdemo=1`
* “Pass” means the expected UI state is visible and stable within ~10 seconds (unless noted).
* Use stable nav anchors:

  * `nav-home`, `nav-planner`, `nav-bills`, `nav-expenses`, `nav-accounts`, `nav-settings`, `nav-add`

### Global health check (PH1)

**Steps**

1. Load the page.
2. Confirm nav buttons exist: Home + Add visible.

**Pass criteria**

* You can click between Home/Expenses/Planner without blank screens.

**Fail capture**

* Screenshot + note which nav element didn’t render.

---

## R.1 — Accounts & Cashflow: add account + bill updates planned balance (H1, B1, A1)

**Steps**

1. Go Home (`nav-home`). Note the displayed balance on the main card (“My Balance” or “Starting Balance”).
2. Go Settings (`nav-settings`) → click **Accounts & Residual**.
3. Add an account:

   * Name: `Regression Bank`
   * Balance: `5000`
   * Save.
4. Go Home. Verify balance increased roughly by +$5,000.
5. Go Bills (`nav-bills`) → Add bill:

   * Name: `Regression Bill`
   * Amount: `150`
   * Save.
6. Go Home. Verify balance is either unchanged from step 4 OR decreased by ~$150 (depending on due-date logic).

**Pass criteria**

* Account persists and balance updates.
* Bill saves and affects Home within the expected envelope.

**Fail capture**

* Screenshot Home + Settings Accounts section; note whether account appears.

---

## R.2 — Goals: create goal + persistence on reload (G1, G2)

**Steps**

1. Settings (`nav-settings`) → Goals.
2. Add goal:

   * Name: `Tesla Fund`
   * Target Amount: `50000`
   * Monthly Contribution: `500`
   * Save.
3. Reload browser page.
4. Return Settings → Goals.

**Pass criteria**

* Goal fields still present after reload.

**Fail capture**

* Screenshot Goals list after reload.

---

## R.3 — Budgets + expenses tracking impacts Actual (BU1, X1, X2, P3)

**Steps**

1. Settings (`nav-settings`) → Budgets.
2. Add category:

   * Category Name: `Ramen`
   * Monthly Limit: `100`
   * Save.
3. Go Planner (`nav-planner`).
4. Record:

   * Planned End Balance
   * Actual End Balance
5. Add transaction via Add (`nav-add`):

   * Amount: `25`
   * Description: `Lunch`
   * Save.
6. Go Expenses (`nav-expenses`) and confirm “Lunch” appears.
7. Return Planner. Re-check Planned and Actual End Balance.

**Pass criteria**

* “Lunch” is visible on Expenses.
* Planned end balance stays roughly the same.
* Actual end balance decreases by about $25 (within tolerance).

**Fail capture**

* Screenshot Planner infographic + Expenses list.

---

## R.4 — Allocation Rules: create + persistence (AR1)

**Steps**

1. Settings (`nav-settings`) → Allocation Rules.
2. Add rule:

   * Rename from “New rule” to `Save 20%`
   * Set value to `20`
   * Save.
3. Reload.
4. Return Settings → Allocation Rules.

**Pass criteria**

* Rule and value persist.

**Fail capture**

* Screenshot Allocation Rules section after reload.

---

## R.5 — Accounts page listing (A2)

**Steps**

1. Ensure at least one account exists (if needed, add via Settings like R.1).
2. Go Accounts (`nav-accounts`).

**Pass criteria**

* “Accounts” heading visible and account cards show names + formatted currency.

**Fail capture**

* Screenshot Accounts page.

---

## R.6 — Planner baseline retained + Actual overlays (P1, P2, P4)

**Steps**

1. Add account (if none): `Planner Bank` balance `1000`.
2. Go Planner.
3. Confirm baseline (Planned end balance is non-zero).
4. Toggle Actual and confirm it’s close to Planned before adding expense.
5. Add transaction:

   * Amount: `45`
   * Description: `Planner Expense`
6. Return Planner and verify:

   * Planned ~ unchanged
   * Actual decreases (Planned - Actual is positive and about the expense amount)
7. Scroll to Week 1 row (if shown) and confirm it has non-zero currency values; if start/net/end all visible, end ≈ start + net.

**Pass criteria**

* Actual overlays expense, Planned stays stable.
* Week row math consistent if values present.

**Fail capture**

* Screenshot Planner toggle + Week 1 row.

---

## R.7 — Income auto-post on payday + bumps balances (AI1, AI2, PH2)

This is the only one that needs “mock today”.

**Manual mock today method**

1. Open DevTools Console.
2. Run:
   `localStorage.setItem('e2e-mock-today','2025-01-14'); location.reload();`
3. Confirm Expenses has **no** “Auto Salary - H”.
4. Run:
   `localStorage.setItem('e2e-mock-today','2025-01-15'); location.reload();`

**Steps**

1. After payday reload, go Expenses (`nav-expenses`).
2. Look for `Auto Salary - H`.
3. Go Accounts (`nav-accounts`) and confirm “Demo Checking” balance increased compared to before payday.

**Pass criteria**

* Salary transaction appears once.
* Balance increases on payday.
* Reload again on same payday does **not** create duplicates.

**Fail capture**

* Screenshot Expenses empty state
* Screenshot Accounts balances
* Note the value of `localStorage.getItem('e2e-mock-today')`

---

# Agent Mode “runner prompt” you can paste

Use this to have Agent Mode execute and report:

```text
You are ChatGPT Agent Mode acting as a UI QA runner.

Target: https://cashflow-a1c11.web.app/?agentdemo=1
Run scenarios PH1, R.1–R.7 from the runbook. For each:
- Steps performed
- Pass/Fail
- Evidence (what text/values you saw)
- Screenshot only on failure

For R.7, use the console commands to set localStorage 'e2e-mock-today' to 2025-01-14 then 2025-01-15 with reloads, and verify "Auto Salary - H" appears and Demo Checking balance increases, with no duplicates on repeat reload.
```

---
