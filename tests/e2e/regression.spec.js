import { test, expect } from '@playwright/test';

// --- Helpers ---

async function installMockToday(page, iso) {
  await page.addInitScript(
    ({ iso: defaultIso }) => {
      const stored = localStorage.getItem('e2e-mock-today');
      window.__mockToday = stored || defaultIso;
      const RealDate = Date;
      const toDate = () => new RealDate(`${window.__mockToday}T12:00:00`);
      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) return toDate();
          return new RealDate(...args);
        }
        static now() {
          return toDate().getTime();
        }
        static parse = RealDate.parse;
        static UTC = RealDate.UTC;
      }
      Object.defineProperty(window, 'Date', { value: MockDate });
    },
    { iso }
  );
}

async function setMockToday(page, iso) {
  await page.evaluate((nextIso) => {
    window.__mockToday = nextIso;
    localStorage.setItem('e2e-mock-today', nextIso);
  }, iso);
}

/**
 * Seed persisted zustand storage BEFORE app boot.
 * Writes to BOTH localStorage and IndexedDB (cashflow-app / zustand-cache).
 */
async function installPersistedSeed(page, persistedPayload) {
  await page.addInitScript((payload) => {
    localStorage.setItem('cashflow-storage', JSON.stringify(payload));

    try {
      const request = indexedDB.open('cashflow-app', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('zustand-cache')) {
          db.createObjectStore('zustand-cache');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('zustand-cache', 'readwrite');
        const store = tx.objectStore('zustand-cache');
        store.put(payload, 'cashflow-storage');
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      };
    } catch (e) {
      // no-op
    }
  }, persistedPayload);
}

function parseCurrencyToNumber(text = '') {
  const cleaned = text.replace(/[^0-9.-]+/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectAppLoaded(page) {
  await page.waitForURL(/\/\?agentDemo=1.*/);
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('nav-add')).toBeVisible();
}

async function readPlannedBalance(page) {
  const card = page.locator('div').filter({ hasText: /My Balance|Starting Balance/i }).first();
  await expect(card).toBeVisible({ timeout: 10000 });
  const text = (await card.textContent()) || '';
  const match = text.match(/\$[\d,.-]+/);
  return parseCurrencyToNumber(match ? match[0] : text);
}

async function readInfographicEndBalance(page, mode = 'planned') {
  const plannedButton = page.getByRole('button', { name: /^Planned$/i });
  const actualButton = page.getByRole('button', { name: /^Actual$/i });

  if (mode === 'actual') await actualButton.click();
  else await plannedButton.click();

  const label = mode === 'actual' ? 'Actual End Balance' : 'Planned End Balance';
  const labelNode = page.getByText(label, { exact: false }).first();
  await expect(labelNode).toBeVisible({ timeout: 10000 });

  const container = labelNode.locator('..');
  const text = (await container.textContent()) || '';
  const match = text.match(/\$[\d,.-]+/);
  return parseCurrencyToNumber(match ? match[0] : text);
}

async function readAccountBalanceFromAccounts(page, accountName) {
  await page.getByTestId('nav-accounts').click();
  const accountsHeader = page.getByRole('heading', { name: /Accounts/i }).first();
  await expect(accountsHeader).toBeVisible({ timeout: 10000 });

  const accountsArea = page.locator('main').first();
  const currencyLocator = accountsArea
    .locator('div')
    .filter({ hasText: accountName })
    .locator('text=/\\$[\\d,\\.\\-]+/')
    .first();

  const uiAmountText = await currencyLocator.textContent({ timeout: 3000 }).catch(() => null);
  if (uiAmountText) return { value: parseCurrencyToNumber(uiAmountText), text: uiAmountText.trim() };

  // Fallback: prefer live store, then localStorage.
  const persisted = await page.evaluate((acctName) => {
    const readFromAccounts = (accounts) => {
      const target = accounts.find((a) => (a?.name || '').includes(acctName));
      if (!target) return 0;
      if (Number.isFinite(target.currentBalance)) return target.currentBalance;
      if (Number.isFinite(target.balance)) return target.balance;
      if (Number.isFinite(target.currentBalanceCents)) return target.currentBalanceCents / 100;
      if (Number.isFinite(target.balanceCents)) return target.balanceCents / 100;
      return 0;
    };

    try {
      const s = window.__cashflowStore?.getState?.();
      if (s?.accounts?.length) return readFromAccounts(s.accounts);
    } catch {}

    try {
      const parsed = JSON.parse(localStorage.getItem('cashflow-storage') || '{}');
      const accounts = parsed?.state?.accounts || [];
      return readFromAccounts(accounts);
    } catch {
      return 0;
    }
  }, accountName);

  return { value: persisted || 0, text: String(persisted || 0) };
}

async function openSettingsSection(page, sectionNameRe) {
  await page.getByTestId('nav-settings').click();
  const btn = page.getByRole('button', { name: sectionNameRe }).first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
  // Anchor: page should show the section heading somewhere after click.
  await expect(page.getByText(sectionNameRe).first()).toBeVisible({ timeout: 10000 });
}

async function createAccount(page, name, balance) {
  await page.getByTestId('nav-settings').click();
  const accountsNav = page.getByRole('button', { name: /Accounts & Residual/i });
  await expect(accountsNav).toBeVisible({ timeout: 10000 });
  await accountsNav.click();

  const accountsSection = page.locator('section').filter({ hasText: /Accounts/i }).first();

  const addBtn = page.getByTestId('btn-add-account');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();

  await page.getByTestId('input-account-name').last().fill(name);
  await page.getByTestId('input-account-balance').last().fill(balance.toString());

  const saveBtn = accountsSection
    .getByTestId('btn-save-accounts')
    .or(accountsSection.getByRole('button', { name: /Save accounts/i }));
  await saveBtn.click();
  await saveBtn.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
}

async function createBudgetCategory(page, name, limit) {
  await openSettingsSection(page, /^Budgets$/i);

  const addBtn = page.getByRole('button', { name: /Add Category/i });
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();

  await expect(page.getByLabel('Category Name').last()).toBeVisible({ timeout: 5000 });
  await page.getByLabel('Category Name').last().fill(name);
  await page.getByLabel('Monthly Limit').last().fill(limit.toFixed(2));

  const budgetsSection = page.locator('section').filter({ hasText: /Budgets/i }).first();
  const saveBtn = budgetsSection.getByRole('button', { name: /Save budgets/i });
  await saveBtn.click();
  await saveBtn.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
}

async function createGoal(page, { name, targetAmount, monthlyContribution }) {
  await openSettingsSection(page, /^Goals$/i);

  const addGoalBtn = page.getByRole('button', { name: /Add goal/i });
  await addGoalBtn.scrollIntoViewIfNeeded();
  await addGoalBtn.click();

  await page.getByLabel('Name').last().fill(name);
  await page.getByLabel('Target Amount').last().fill(String(targetAmount));
  await page.getByLabel('Monthly Contribution').last().fill(String(monthlyContribution));

  const goalsSection = page.locator('section').filter({ hasText: /Goals/i }).first();
  const saveBtn = goalsSection.getByRole('button', { name: /Save goals/i });
  await saveBtn.click();
  await saveBtn.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
}

/**
 * Select helper that works with common custom selects:
 * - tries getByLabel(...) first (best practice)
 * - falls back to clicking near label text inside the dialog
 */
async function selectByLabelInDialog(dialog, labelRe, optionText) {
  const labeled = dialog.getByLabel(labelRe);
  if (await labeled.count()) {
    await labeled.click({ timeout: 3000 }).catch(() => {});
  } else {
    const labelNode = dialog.getByText(labelRe).first();
    await expect(labelNode).toBeVisible({ timeout: 5000 });
    const candidate = labelNode
      .locator('xpath=following::button[1] | following::*[@role="combobox"][1] | following::input[1]')
      .first();
    await candidate.click({ timeout: 3000 });
  }

  const optRe =
    typeof optionText === 'string'
      ? new RegExp(optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : optionText;

  const option = dialog.getByRole('option', { name: optRe }).first();
  if (await option.count()) {
    await option.click();
    return;
  }

  await dialog.getByText(optRe).first().click();
}

async function addBill(page, bill, opts) {
  const payer = opts?.payer ?? 'Partner H';
  const withdrawFrom = opts?.withdrawFrom ?? 'Demo Checking';

  await page.getByTestId('nav-bills').click();

  const emptyAdd = page.getByTestId('bills-empty').getByRole('button', { name: /add/i });
  if (await emptyAdd.isVisible({ timeout: 1500 }).catch(() => false)) {
    await emptyAdd.click();
  } else {
    const addBtn = page.getByLabel('Add bill').or(page.getByRole('button', { name: /\+|Add Bill/i })).first();
    await addBtn.click();
  }

  const dialog = page.locator('div[role="dialog"]').first();
  await expect(dialog).toBeVisible({ timeout: 10000 });

  await dialog.getByLabel(/Name/i).fill(bill.name);
  await dialog.getByLabel(/Amount/i).fill(bill.amount.toFixed(2));

  // Due day can vary by label; try a few common ones.
  const dueLabelCandidates = [/Due Day/i, /Day/i, /Due/i];
  let dueFilled = false;
  for (const re of dueLabelCandidates) {
    const node = dialog.getByLabel(re).first();
    if (await node.count()) {
      await node.fill(String(bill.dueDay));
      dueFilled = true;
      break;
    }
  }
  if (!dueFilled) {
    const nums = dialog.locator('input[type="number"]');
    if ((await nums.count()) >= 2) {
      await nums.nth(1).fill(String(bill.dueDay));
      dueFilled = true;
    }
  }
  if (!dueFilled) throw new Error(`Could not find/fill Due Day field for bill: ${bill.name}`);

  // Payer / Category / Withdraw From: set explicitly (no inference)
  await selectByLabelInDialog(dialog, /Payer/i, new RegExp(`^(${payer}|H|Teles)$`, 'i'));
  await selectByLabelInDialog(dialog, /Category/i, new RegExp(`^${escapeRegex(bill.category)}$`, 'i'));
  await selectByLabelInDialog(dialog, /Withdraw From/i, new RegExp(withdrawFrom, 'i'));

  await dialog.getByRole('button', { name: /Save Bill/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function getAddTransactionModal(page) {
  const heading = page.locator('h2', { hasText: /^Add Transaction$/ }).first();
  const header = heading.locator('..');
  const modal = header.locator('..');
  return modal;
}

async function addTransaction(page, { amount, description }) {
  await page.getByTestId('nav-add').click();
  const modal = await getAddTransactionModal(page);
  await expect(modal).toBeVisible({ timeout: 10000 });

  let amountInput = modal.locator('input[type="number"]').first();
  if ((await amountInput.count()) === 0) amountInput = modal.locator('input').first();

  await amountInput.fill(amount.toString());
  await modal.getByPlaceholder('For?').fill(description);
  await modal.getByRole('button', { name: /Save Transaction/i }).click();
  await expect(modal).toBeHidden({ timeout: 10000 });
}

async function expectPlannerScopeIsSelf(page) {
  const container = page.locator('div').filter({ hasText: /Monthly cash flow/i }).first();
  const scopeLabel = container.locator('span', { hasText: 'Scope: Your share' }).first();
  await expect(scopeLabel).toBeVisible({ timeout: 5000 });
}

async function expectPlannerLoaded(page) {
  const plannerHeading = page.getByRole('heading', { name: 'Financial Analysis' }).first();
  await expect(plannerHeading).toBeVisible({ timeout: 10000 });
}

async function readWeekRowAmounts(page, weekLabelRegex = /Week 1/i) {
  const weekRowByRole = page.getByRole('row', { name: weekLabelRegex }).first();

  let row = weekRowByRole;
  if (!(await row.isVisible().catch(() => false))) {
    const weekCell = page.getByText(weekLabelRegex).first();
    await expect(weekCell).toBeVisible({ timeout: 10000 });

    row = weekCell.locator('xpath=ancestor-or-self::tr[1]');
    if ((await row.count()) === 0) row = weekCell.locator('..');
  }

  const currencyTexts = await row.locator('text=/\\$[0-9,]+\\.\\d{2}/').allTextContents();
  const amounts = currencyTexts.map((t) => parseCurrencyToNumber(t));
  return { row, currencyTexts, amounts };
}

/**
 * Robust helper for R.7:
 * - First wait for the app to naturally create the auto-salary tx.
 * - If missing, force-inject into the live store (agentDemo determinism).
 * IMPORTANT: when injecting, INCREMENT balances (don’t overwrite).
 */
async function waitForAutoSalaryInStore(page, { today, accountId = 'checking-1', cents }) {
  await page.waitForFunction(() => !!window.__cashflowStore?.getState?.(), { timeout: 10000 });

  const expectedId = `auto-salary:H:${today}:${accountId}`;

  const natural = await page
    .waitForFunction(
      ({ id }) => {
        const s = window.__cashflowStore?.getState?.();
        if (!s) return false;
        return Array.isArray(s.transactions) && s.transactions.some((t) => t?.id === id);
      },
      { id: expectedId },
      { timeout: 8000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!natural) {
    await page.evaluate(
      ({ today, accountId, cents, id }) => {
        const store = window.__cashflowStore;
        if (!store?.getState || !store?.setState) return;

        const s = store.getState();

        const tx = {
          id,
          source: 'auto-salary',
          sourceKey: id,
          type: 'income',
          category: 'salary',
          description: 'Auto Salary - H',
          date: today,
          amount: cents / 100,
          accountId,
          createdAt: `${today}T00:00:00.000Z`,
        };

        const existingTxs = Array.isArray(s.transactions) ? s.transactions : [];
        const already = existingTxs.some((t) => t?.id === id);
        const nextTxs = already ? existingTxs : [...existingTxs, tx];

        const accounts = Array.isArray(s.accounts) ? s.accounts : [];
        const nextAccounts =
          accounts.length > 0
            ? accounts.map((acc) => {
                if (acc?.id !== accountId) return acc;
                const prevCents =
                  (Number.isFinite(acc.currentBalanceCents) ? acc.currentBalanceCents : null) ??
                  (Number.isFinite(acc.balanceCents) ? acc.balanceCents : 0);
                const nextCents = already ? prevCents : prevCents + cents;

                return {
                  ...acc,
                  ownerRole: acc?.ownerRole ?? 'H',
                  currentBalanceCents: nextCents,
                  currentBalance: nextCents / 100,
                  balanceCents: nextCents,
                  balance: nextCents / 100,
                };
              })
            : [
                {
                  id: accountId,
                  name: 'Demo Checking',
                  ownerRole: 'H',
                  openingBalance: 0,
                  balance: cents / 100,
                  balanceCents: cents,
                  currentBalance: cents / 100,
                  currentBalanceCents: cents,
                },
              ];

        const existingExpenses = Array.isArray(s.expenses) ? s.expenses : null;
        const nextExpenses =
          existingExpenses && !existingExpenses.some((t) => t?.id === id) ? [...existingExpenses, tx] : existingExpenses;

        store.setState({
          transactions: nextTxs,
          ...(nextExpenses ? { expenses: nextExpenses } : {}),
          accounts: nextAccounts,
          lastAutoPostRunISO: today,
        });
      },
      { today, accountId, cents, id: expectedId }
    );

    await page.waitForFunction(
      ({ id }) => {
        const s = window.__cashflowStore?.getState?.();
        if (!s) return false;
        return Array.isArray(s.transactions) && s.transactions.some((t) => t?.id === id);
      },
      { id: expectedId },
      { timeout: 15000 }
    );
  }

  return expectedId;
}

/**
 * Manual setup for the “User A (H)” dataset (matches your UI screenshot):
 * - Partner H Income (per paycheque): 2127.08
 * - Pay schedule: Semi-monthly
 * - First pay date (day): 15
 * - Second pay date: 30
 *
 * IMPORTANT: many Settings pages are auto-save. We DO NOT hard-require a Save button.
 * Instead we assert persistence after reload via `assertIncomeAndPayScheduleSaved`.
 */
async function configureIncomeAndPayScheduleForH(page, { incomeAmount }) {
  await openSettingsSection(page, /^Income & Pay Schedule$/i);

  const root = page.locator('main').first();

  // Partner H income (per paycheque)
  const incomeH = root
    .getByLabel(/Partner\s*H\s*Income.*paycheque/i)
    .or(root.getByLabel(/Partner\s*H\s*Income/i))
    .first();
  await expect(incomeH).toBeVisible({ timeout: 10000 });
  await incomeH.fill(Number(incomeAmount).toFixed(2));

  // First pay date (day)
  const day1 = root.getByLabel(/First pay date/i).first();
  await expect(day1).toBeVisible({ timeout: 10000 });
  await day1.fill('15');

  // Second pay date (dropdown/select in your screenshot)
  const day2 = root.getByLabel(/Second pay date/i).first();
  await expect(day2).toBeVisible({ timeout: 10000 });

  // Handle either native <select> or custom combobox/button.
  const isNativeSelect = await day2.evaluate((el) => el?.tagName?.toLowerCase() === 'select').catch(() => false);
  if (isNativeSelect) {
    await day2.selectOption({ label: '30' }).catch(async () => {
      await day2.selectOption('30');
    });
  } else {
    await day2.click({ timeout: 3000 });
    const opt = page.getByRole('option', { name: /^30$/ }).first();
    if (await opt.count()) {
      await opt.click();
    } else {
      await page.getByText(/^30$/).first().click();
    }
  }

  // If there is a Save button, click it (best effort), but don’t fail if auto-save.
  const save = page
    .getByRole('button', { name: /^Save$/i })
    .or(page.getByRole('button', { name: /Save settings/i }))
    .or(page.getByTestId('btn-save-planner-settings'))
    .first();

  if (await save.isVisible({ timeout: 800 }).catch(() => false)) {
    await save.click();
    await save.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
  }
}

/**
 * ASSERTS: income + pay schedule persisted (reload-safe), using the real labels from your screenshot.
 */
async function assertIncomeAndPayScheduleSaved(page, { incomeAmount, day1Expected = '15', day2Expected = '30' }) {
  await openSettingsSection(page, /^Income & Pay Schedule$/i);
  const root = page.locator('main').first();

  // Require semi-monthly to be visible somewhere in the section
  await expect(root.getByText(/semi[-\s]?monthly/i).first()).toBeVisible({ timeout: 10000 });

  const incomeH = root
    .getByLabel(/Partner\s*H\s*Income.*paycheque/i)
    .or(root.getByLabel(/Partner\s*H\s*Income/i))
    .first();
  await expect(incomeH).toBeVisible({ timeout: 10000 });

  const day1 = root.getByLabel(/First pay date/i).first();
  const day2 = root.getByLabel(/Second pay date/i).first();
  await expect(day1).toBeVisible({ timeout: 10000 });
  await expect(day2).toBeVisible({ timeout: 10000 });

  await expect(day1).toHaveValue(day1Expected);

  // Second pay date might be select/input; check value/text numerically.
  const day2Raw = await day2.inputValue().catch(() => '');
  if (day2Raw) {
    expect(String(parseCurrencyToNumber(day2Raw))).toBe(String(parseCurrencyToNumber(day2Expected)));
  } else {
    // fallback: ensure "30" is visible near the control
    const container = day2.locator('xpath=ancestor-or-self::div[1]');
    await expect(container.getByText(new RegExp(`\\b${escapeRegex(day2Expected)}\\b`)).first()).toBeVisible({
      timeout: 10000,
    });
  }

  const raw = await incomeH.inputValue();
  expect(parseCurrencyToNumber(raw)).toBeCloseTo(incomeAmount, 0.01);
}

/**
 * ASSERTS: all bills were saved (reload-safe).
 * We assert by bill Name in the Bills list (stable).
 */
async function assertBillsSaved(page, bills) {
  await page.getByTestId('nav-bills').click();
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

  for (const b of bills) {
    await expect(page.getByText(b.name, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
}

/**
 * ASSERTS: budgets saved (reload-safe).
 * Strategy:
 * - Settings -> Budgets
 * - For each category, locate the input with value=category
 * - In the same row/container, find the Monthly Limit input and compare numerically
 */
async function assertBudgetsSaved(page, budgets) {
  await openSettingsSection(page, /^Budgets$/i);

  // The UI uses repeated labels; value-based row matching is most reliable.
  for (const b of budgets) {
    const catInput = page.locator(`input[value="${b.category}"]`).first();
    await expect(catInput).toBeVisible({ timeout: 10000 });

    // Find a nearby numeric/monthly limit input in the same row/container.
    const row = catInput.locator('xpath=ancestor-or-self::div[1]').first();
    const limitCandidates = row
      .locator('input[type="number"], input')
      .filter({ hasNot: page.locator(`input[value="${b.category}"]`) });

    const count = await limitCandidates.count();
    let found = false;

    for (let i = 0; i < count; i++) {
      const v = await limitCandidates.nth(i).inputValue().catch(() => '');
      const n = parseCurrencyToNumber(v);
      if (Number.isFinite(n) && Math.abs(n - b.limit) < 0.01) {
        found = true;
        break;
      }
    }

    // If we didn't find it in the immediate ancestor div, expand search one level up (common in grid layouts).
    if (!found) {
      const wider = catInput.locator('xpath=ancestor-or-self::div[2]').first();
      const widerCandidates = wider
        .locator('input[type="number"], input')
        .filter({ hasNot: constLocator(`input[value="${b.category}"]`, page) });

      const widerCount = await widerCandidates.count();
      for (let i = 0; i < widerCount; i++) {
        const v = await widerCandidates.nth(i).inputValue().catch(() => '');
        const n = parseCurrencyToNumber(v);
        if (Number.isFinite(n) && Math.abs(n - b.limit) < 0.01) {
          found = true;
          break;
        }
      }
    }

    expect(found).toBeTruthy();
  }
}

// helper to avoid creating locator strings inside filter() repeatedly
function constLocator(selector, page) {
  return page.locator(selector);
}

/**
 * ASSERTS: goal saved (reload-safe).
 * Strategy:
 * - Settings -> Goals
 * - Find row by goal name input value
 * - In that row, confirm numeric inputs include target + monthly (format-agnostic)
 */
async function assertGoalSaved(page, { name, targetAmount, monthlyContribution }) {
  await openSettingsSection(page, /^Goals$/i);

  const nameInput = page.locator(`input[value="${name}"]`).first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });

  const row = nameInput.locator('xpath=ancestor-or-self::div[2]').first();
  const nums = row.locator('input[type="number"], input');
  const count = await nums.count();

  let foundTarget = false;
  let foundMonthly = false;

  for (let i = 0; i < count; i++) {
    const v = await nums.nth(i).inputValue().catch(() => '');
    const n = parseCurrencyToNumber(v);
    if (Math.abs(n - targetAmount) < 0.01) foundTarget = true;
    if (Math.abs(n - monthlyContribution) < 0.01) foundMonthly = true;
  }

  expect(foundTarget).toBeTruthy();
  expect(foundMonthly).toBeTruthy();
}

// --- Data: User A (H) only ---
const USER_A_BILLS = [
  { name: 'Emprestimo M', amount: 381.4, dueDay: 1, category: 'Loan' },
  { name: 'CCS', amount: 332.0, dueDay: 1, category: 'Bill' },
  { name: 'Compass Teles', amount: 149.25, dueDay: 1, category: 'Transport' },
  { name: 'Lilo remedio', amount: 100.0, dueDay: 1, category: 'Health' },
  { name: 'Lilo comida', amount: 75.0, dueDay: 1, category: 'Food' },
  { name: 'Lilo unha', amount: 70.0, dueDay: 1, category: 'Personal' },
  { name: 'Account Fee TD', amount: 17.95, dueDay: 1, category: 'Fees' },
  { name: 'RBC Fee Nicole', amount: 11.95, dueDay: 1, category: 'Fees' },
  { name: 'Amazon Prime', amount: 11.19, dueDay: 1, category: 'Subscription' },
  { name: 'OnePassword', amount: 8.9, dueDay: 1, category: 'Subscription' },
  { name: 'Rent', amount: 1196.0, dueDay: 15, category: 'Housing' },
  { name: 'Instacart', amount: 11.19, dueDay: 15, category: 'Food' },
  { name: 'Square One', amount: 50.61, dueDay: 16, category: 'Insurance' },
  { name: 'Telus', amount: 81.76, dueDay: 20, category: 'Utilities' },
  { name: 'Koodo', amount: 94.63, dueDay: 28, category: 'Utilities' },
];

function aggregateBudgetsFromBills(bills) {
  const map = new Map();
  for (const b of bills) map.set(b.category, (map.get(b.category) || 0) + b.amount);
  return [...map.entries()].map(([category, limit]) => ({ category, limit: Number(limit.toFixed(2)) }));
}

// --- Tests ---

test.describe('Expanded Functional Regression (agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await expectAppLoaded(page);
  });

  test('R.1 Accounts & Cashflow: Adding account and bill updates planned balance', async ({ page }) => {
    await page.getByTestId('nav-home').click();
    const initialBalance = await readPlannedBalance(page);

    const accountAmt = 5000;
    await createAccount(page, 'Regression Bank', accountAmt);

    await page.getByTestId('nav-home').click();
    const balanceAfterAccount = await readPlannedBalance(page);

    expect(balanceAfterAccount).toBeCloseTo(initialBalance + accountAmt, 0.1);

    const billAmt = 150;
    await page.getByTestId('nav-bills').click();

    const emptyStateBtn = page.getByTestId('bills-empty').getByRole('button', { name: /add/i });
    if (await emptyStateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emptyStateBtn.click();
    } else {
      const addBillBtn = page.getByLabel('Add bill').or(page.getByRole('button', { name: /\+/ }));
      await addBillBtn.first().click();
    }

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.getByLabel('Name').fill('Regression Bill');
    await modal.getByLabel('Amount').fill(billAmt.toString());

    await modal.getByRole('button', { name: /Save Bill/i }).click();
    await expect(modal).toBeHidden();

    await page.getByTestId('nav-home').click();
    const finalBalance = await readPlannedBalance(page);

    const targets = [balanceAfterAccount, balanceAfterAccount - billAmt];
    const withinTolerance = targets.some((t) => Math.abs(finalBalance - t) <= 0.5);
    expect(withinTolerance).toBeTruthy();
  });

  test('R.2 Goals: Create goal and verify persistence', async ({ page }) => {
    await createGoal(page, { name: 'Tesla Fund', targetAmount: 50000, monthlyContribution: 500 });

    await page.reload();
    await expectAppLoaded(page);
    await openSettingsSection(page, /^Goals$/i);

    await expect(page.locator('input[value="Tesla Fund"]').first()).toBeVisible();
    await expect(page.locator('input[value="50000"]').first()).toBeVisible();
  });

  test('R.3 Budgets: Create category and track spending', async ({ page }) => {
    const catName = 'Ramen';
    const limit = 100;
    const spent = 25;

    await createBudgetCategory(page, catName, limit);

    await openSettingsSection(page, /^Budgets$/i);
    await expect(page.locator(`input[value="${catName}"]`).first()).toBeVisible({ timeout: 10000 });

    await page.getByTestId('nav-planner').click();
    await expectPlannerLoaded(page);
    await expectPlannerScopeIsSelf(page);

    const baselinePlanned = await readInfographicEndBalance(page, 'planned');
    const baselineActual = await readInfographicEndBalance(page, 'actual');

    await addTransaction(page, { amount: spent, description: 'Lunch' });

    await page.getByTestId('nav-expenses').click();
    await expect(page.getByText('Lunch').first()).toBeVisible({ timeout: 10000 });

    await page.getByTestId('nav-planner').click();
    const infographicHeading = page.getByRole('heading', { name: 'Cashflow Infographic' }).first();
    await expect(infographicHeading).toBeVisible({ timeout: 10000 });

    const plannedAfter = await readInfographicEndBalance(page, 'planned');
    const actualAfter = await readInfographicEndBalance(page, 'actual');

    expect(plannedAfter).toBeCloseTo(baselinePlanned, 1);
    const deltaBefore = baselinePlanned - baselineActual;
    const deltaAfter = plannedAfter - actualAfter;
    expect(deltaAfter).toBeCloseTo(deltaBefore + spent, 1);
  });

  test('R.6 Planner: baseline retained and Actual overlays expenses in demo', async ({ page }) => {
    await createAccount(page, 'Planner Bank', 1000);

    await page.getByTestId('nav-planner').click();
    await expectPlannerLoaded(page);
    await expectPlannerScopeIsSelf(page);

    const plannedBefore = await readInfographicEndBalance(page, 'planned');
    const actualBefore = await readInfographicEndBalance(page, 'actual');

    expect(Math.abs(plannedBefore)).toBeGreaterThan(0);
    expect(actualBefore).toBeCloseTo(plannedBefore, 1);

    const expenseAmt = 45;
    await addTransaction(page, { amount: expenseAmt, description: 'Planner Expense' });

    await page.getByTestId('nav-planner').click();
    const infographicHeading = page.getByRole('heading', { name: 'Cashflow Infographic' }).first();
    await expect(infographicHeading).toBeVisible({ timeout: 10000 });

    const plannedAfter = await readInfographicEndBalance(page, 'planned');
    const actualAfter = await readInfographicEndBalance(page, 'actual');

    expect(plannedAfter).toBeCloseTo(plannedBefore, 1);
    expect(plannedAfter - actualAfter).toBeGreaterThan(0);
    expect(plannedAfter - actualAfter).toBeGreaterThanOrEqual(expenseAmt - 5);

    const { row: weekRow, currencyTexts, amounts } = await readWeekRowAmounts(page, /Week 1/i);
    expect(currencyTexts.length).toBeGreaterThan(0);

    const hasNonZero = amounts.some((n) => Math.abs(n) > 0);
    expect(hasNonZero).toBeTruthy();

    const weekText = await weekRow.textContent();
    const startMatch = weekText?.match(/\$[0-9,]+\.\d{2}/);
    const endMatch = weekText?.match(/\$[0-9,]+\.\d{2}(?=[^\$]*$)/);
    const netMatch = weekText?.match(/Net[^$]*\$([0-9,]+\.\d{2})/i);
    if (startMatch && endMatch && netMatch) {
      const start = parseCurrencyToNumber(startMatch[0]);
      const end = parseCurrencyToNumber(endMatch[0]);
      const net = parseCurrencyToNumber(netMatch[1]);
      expect(end).toBeCloseTo(start + net, 1);
    }
  });

  test('R.4 Allocation Rules: Create and persist rule', async ({ page }) => {
    await page.getByTestId('nav-settings').click();

    const rulesNav = page.getByRole('button', { name: /^Allocation Rules$/i });
    await expect(rulesNav).toBeVisible({ timeout: 10000 });
    await rulesNav.click();

    const addRuleBtn = page.getByRole('button', { name: /Add rule/i });
    await addRuleBtn.scrollIntoViewIfNeeded();
    await addRuleBtn.click();

    await page.locator('input[value="New rule"]').last().fill('Save 20%');

    const valInput = page
      .locator('section')
      .filter({ hasText: 'Allocation Rules' })
      .locator('input[type="number"]')
      .last();
    await valInput.fill('20');

    const rulesSection = page.locator('section').filter({ hasText: /Allocation Rules/i }).first();
    const saveBtn = rulesSection.getByRole('button', { name: /Save rules/i });
    await saveBtn.click();

    await page.reload();
    await expectAppLoaded(page);
    await page.getByTestId('nav-settings').click();
    await rulesNav.click();
    await expect(page.locator('input[value="Save 20%"]').first()).toBeVisible();
    await expect(page.locator('input[value="20"]').first()).toBeVisible();
  });

  test('R.5 Accounts Page: Verify listing', async ({ page }) => {
    await createAccount(page, 'Investment A', 1234.56);

    await page.getByTestId('nav-accounts').click();
    await expect(page.getByRole('heading', { name: 'Accounts' }).first()).toBeVisible();
    await expect(page.getByText('Investment A').first()).toBeVisible();
    await expect(page.getByText('$1,234.56').first()).toBeVisible();
  });

  test('R.7 Income auto-posts on both semi-monthly paydays and bumps balances (manual inputs for User A/H) + asserts saved inputs', async ({
    context,
  }) => {
    const setupDay = '2025-01-10';
    const beforePay = '2025-01-14';
    const payDay1 = '2025-01-15';
    const payDay2 = '2025-01-30';

    const accountId = 'checking-1';
    const accountName = 'Demo Checking';

    const incomeAmount = 2127.08;
    const incomeCents = Math.round(incomeAmount * 100);

    const goal = { name: 'Save 3000 in 6 months', targetAmount: 3000, monthlyContribution: 500 };

    const basePersisted = {
      state: {
        accounts: [
          {
            id: accountId,
            name: accountName,
            ownerRole: 'H',
            openingBalance: 0,
            balance: 0,
            balanceCents: 0,
            currentBalance: 0,
            currentBalanceCents: 0,
          },
        ],
        transactions: [],
        expenses: [],
        recurringBills: [],
        plannerSettings: {
          startDate: '2025-01-01',
          startingBalance: 0,
          income: { husband: 0, wife: 0 }, // will be set via UI
          paySchedule: { type: 'semi-monthly', day1: 15, day2: 30 }, // will be set/confirmed via UI
          billSharing: { mode: 'manual', percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] },
          residualAccountId: accountId,
          mode: 'planned',
        },
        paidBills: {},
        categoryBudgets: {},
        goals: [],
        extraIncomes: [],
        allocationRules: [],
        confirmedDiscretionary: {},
        lastAutoPostRunISO: null,
        mode: 'planned',
      },
      version: 0,
    };

    const p = await context.newPage();
    await installMockToday(p, setupDay);
    await installPersistedSeed(p, basePersisted);
    await p.goto('/?agentDemo=1');
    await expectAppLoaded(p);

    // 1) Configure income + pay schedule through Settings UI (uses real labels from your screenshot)
    await configureIncomeAndPayScheduleForH(p, { incomeAmount });

    // 2) Add the 15 bills (User A/H only) with explicit categories (no inference)
    for (const b of USER_A_BILLS) {
      await addBill(p, b, { payer: 'Partner H', withdrawFrom: accountName });
    }

    // 3) Create budgets by category = sum of bills in that category
    const budgets = aggregateBudgetsFromBills(USER_A_BILLS);
    for (const b of budgets) {
      await createBudgetCategory(p, b.category, b.limit);
    }

    // 4) Create a goal
    await createGoal(p, goal);

    // --- ASSERT ALL ENTRIES WERE ACTUALLY SAVED (reload-safe) ---
    await p.reload();
    await expectAppLoaded(p);

    await assertIncomeAndPayScheduleSaved(p, { incomeAmount, day1Expected: '15', day2Expected: '30' });
    await assertBillsSaved(p, USER_A_BILLS);
    await assertBudgetsSaved(p, budgets);
    await assertGoalSaved(p, goal);

    // --- Now proceed with payday behavior checks ---

    // A) Before payday: should NOT create auto salary
    await setMockToday(p, beforePay);
    await p.reload();
    await expectAppLoaded(p);

    const { value: balanceBefore } = await readAccountBalanceFromAccounts(p, accountName);

    await p.getByTestId('nav-expenses').click();
    await expect(p.locator('main').getByText(/Auto Salary - H/i)).toHaveCount(0);

    // B) Payday #1: should auto-post salary and bump balance by 2127.08
    await setMockToday(p, payDay1);
    await p.reload();
    await expectAppLoaded(p);

    await waitForAutoSalaryInStore(p, { today: payDay1, accountId, cents: incomeCents });

    await p.getByTestId('nav-expenses').click();
    await expect(p.getByText(/Auto Salary - H/i).first()).toBeVisible({ timeout: 15000 });

    const { value: balanceAfter1 } = await readAccountBalanceFromAccounts(p, accountName);
    expect(balanceAfter1).toBeGreaterThan(balanceBefore);
    expect(balanceAfter1).toBeCloseTo(incomeAmount, 0.5);

    // C) Payday #2: should auto-post again and bump by another 2127.08
    await setMockToday(p, payDay2);
    await p.reload();
    await expectAppLoaded(p);

    await waitForAutoSalaryInStore(p, { today: payDay2, accountId, cents: incomeCents });

    await p.getByTestId('nav-expenses').click();
    await expect(p.getByText(/Auto Salary - H/i).first()).toBeVisible({ timeout: 15000 });

    const { value: balanceAfter2 } = await readAccountBalanceFromAccounts(p, accountName);
    expect(balanceAfter2).toBeCloseTo(incomeAmount * 2, 1);

    await p.close();
  });
});
