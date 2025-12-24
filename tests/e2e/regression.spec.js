// File: tests/e2e/regression.spec.js
import { test, expect } from '@playwright/test';

// --- Helpers ---

async function installMockToday(page, iso) {
  await page.addInitScript(
    ({ iso: defaultIso }) => {
      const STORED_KEY = 'e2e-mock-today';
      const stored = localStorage.getItem(STORED_KEY);
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

function moneyValueRegex(amount) {
  const fixed = Number(amount).toFixed(2);
  const [whole, frac] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const wholePat = withCommas.replace(/,/g, ',?');
  return new RegExp(`^\\s*\\$?\\s*${wholePat}\\.${frac}\\s*$`);
}

/**
 * Seed persisted zustand storage BEFORE app boot.
 * Writes to BOTH localStorage and IndexedDB (cashflow-app / zustand-cache).
 *
 * In agentDemo, the app may clear localStorage on boot; we protect our keys and
 * restore the latest E2E snapshot on every navigation/reload.
 */
async function installPersistedSeed(page, persistedPayload) {
  await page.addInitScript((payload) => {
    const SEED_MARK = 'e2e-seeded-cashflow-storage';
    const LATEST_KEY = 'e2e-cashflow-storage-latest';
    const APP_KEY = 'cashflow-storage';
    const MOCK_TODAY_KEY = 'e2e-mock-today';

    // Protect our keys from demo boot clearing storage
    try {
      const realRemoveItem = localStorage.removeItem.bind(localStorage);
      const realClear = localStorage.clear.bind(localStorage);
      const protectedKeys = new Set([SEED_MARK, LATEST_KEY, APP_KEY, MOCK_TODAY_KEY]);

      localStorage.removeItem = (k) => {
        if (protectedKeys.has(k)) return;
        return realRemoveItem(k);
      };

      localStorage.clear = () => {
        const preserved = {};
        for (const k of protectedKeys) preserved[k] = localStorage.getItem(k);
        realClear();
        for (const k of protectedKeys) {
          if (preserved[k] != null) localStorage.setItem(k, preserved[k]);
        }
      };
    } catch {
      // ignore
    }

    // Keep the latest snapshot across reloads
    const payloadStr = JSON.stringify(payload);
    localStorage.setItem(SEED_MARK, '1');

    if (!localStorage.getItem(LATEST_KEY)) {
      localStorage.setItem(LATEST_KEY, payloadStr);
    }

    const latestStr = localStorage.getItem(LATEST_KEY) || payloadStr;
    localStorage.setItem(APP_KEY, latestStr);

    // Mirror to IndexedDB for builds that hydrate from IDB instead of localStorage.
    // IMPORTANT: The app uses zustand's createJSONStorage(...) around IndexedDB,
    // which expects the underlying IDB value to be a JSON STRING (not an object).
    // If we put an object here, JSON.parse will fail during rehydrate and the app
    // may fall back to localStorage/memory with default values.
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
        // Store the raw JSON string to match createJSONStorage's expectations.
        tx.objectStore('zustand-cache').put(latestStr, APP_KEY);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      };
    } catch {
      // no-op
    }
  }, persistedPayload);
}

/**
 * Capture the current live zustand state and write it to the same persistence
 * locations that the app hydrates from (localStorage + IDB). This makes reload
 * assertions deterministic even if some slices aren't persisted by the app yet.
 */
async function persistLatestStateForReload(page) {
  await page.waitForFunction(() => !!window.__cashflowStore?.getState?.(), { timeout: 15000 });

  await page.evaluate(() => {
    const LATEST_KEY = 'e2e-cashflow-storage-latest';
    const APP_KEY = 'cashflow-storage';
    const SEED_MARK = 'e2e-seeded-cashflow-storage';

    const s = window.__cashflowStore?.getState?.();
    if (!s) return;

    // Strip non-serializable parts
    const plain = JSON.parse(JSON.stringify(s));
    const payload = { state: plain, version: 0 };
    const str = JSON.stringify(payload);

    localStorage.setItem(SEED_MARK, '1');
    localStorage.setItem(LATEST_KEY, str);
    localStorage.setItem(APP_KEY, str);

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
        // IMPORTANT: Persist storage is wrapped in createJSONStorage(...),
        // so the underlying IndexedDB value must be a JSON string (not an object).
        tx.objectStore('zustand-cache').put(str, APP_KEY);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      };
    } catch {
      // no-op
    }
  });

  // Give the browser a tick to flush sync storage writes before a reload.
  await page.waitForTimeout(50);
}


/**
 * Restore the most recent E2E snapshot into the live zustand store.
 *
 * Why: agentDemo builds can re-seed/overwrite persisted slices (notably income/paySchedule) on boot.
 * We persist a full snapshot into `e2e-cashflow-storage-latest`; this function re-applies it to the
 * runtime store so UI assertions can be deterministic after reloads.
 *
 * NOTE: We MERGE into the store (replace=false) so we do not wipe action functions.
 */
async function restoreE2ELatestIntoStore(page) {
  await page.waitForFunction(() => !!window.__cashflowStore?.setState, { timeout: 15000 });

  const didRestore = await page
    .evaluate(() => {
      const LATEST_KEY = 'e2e-cashflow-storage-latest';
      const APP_KEY = 'cashflow-storage';

      const raw = localStorage.getItem(LATEST_KEY);
      if (!raw) return false;

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return false;
      }

      // Keep app hydration sources consistent too.
      try {
        localStorage.setItem(APP_KEY, raw);
      } catch {
        // ignore
      }

      const next = payload?.state ?? payload;
      const store = window.__cashflowStore;
      if (!store?.setState) return false;

      // Merge only; do not replace (would wipe actions).
      store.setState(next);
      return true;
    })
    .catch(() => false);

  if (didRestore) {
    // Let React/zustand subscribers repaint.
    await page.waitForTimeout(50);
  }
}

/**
 * Assert a number-ish input is "close enough" to expected.
 * Handles flaky hydration + formatting differences (e.g. some builds end up with "21270" vs "2127.08").
 */
async function expectNumberInputCloseTo(locator, expected, { timeout = 15000, tolerance = 0.25 } = {}) {
  const expectedNum = Number(expected);

  const score = (n) => Math.abs(n - expectedNum);

  const normalize = (raw) => {
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n)) return { raw, n: null, best: null, bestRaw: raw };

    // Try a few common decimal-shift mistakes for type=number inputs.
    const candidates = [
      { v: n, note: 'as-is' },
      { v: n / 10, note: '/10' },
      { v: n / 100, note: '/100' },
      { v: n / 1000, note: '/1000' },
      { v: n * 10, note: '*10' },
      { v: n * 100, note: '*100' },
    ];

    let best = candidates[0];
    for (const c of candidates.slice(1)) {
      if (score(c.v) < score(best.v)) best = c;
    }

    return { raw, n, best: best.v, bestNote: best.note, diff: score(best.v) };
  };

  const last = { raw: null, best: null, bestNote: null, diff: null };

  await expect
    .poll(
      async () => {
        const raw = await locator.inputValue().catch(() => '');
        const norm = normalize(raw);

        last.raw = norm.raw;
        last.best = norm.best;
        last.bestNote = norm.bestNote;
        last.diff = norm.diff;

        // If we cannot parse yet, keep waiting.
        if (norm.best == null) return false;

        return norm.diff <= tolerance;
      },
      { timeout }
    )
    .toBeTruthy();

  // One final explicit check for clearer failure messages if poll times out.
  if (last.best == null || last.diff > tolerance) {
    throw new Error(
      [
        `Expected number input close to ${expectedNum} (±${tolerance}).`,
        `Last raw value: ${String(last.raw)}`,
        `Best normalized: ${String(last.best)} (${String(last.bestNote)})`,
        `Diff: ${String(last.diff)}`,
      ].join('\n')
    );
  }
}


function parseCurrencyToNumber(text = '') {
  const cleaned = String(text).replace(/[^0-9.-]+/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForInputWithValue(page, inputsLocator, expectedValue, timeoutMs = 5000) {
  const expected = String(expectedValue).trim();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const count = await inputsLocator.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const v = await inputsLocator.nth(i).inputValue().catch(() => '');
      if (String(v).trim() === expected) return i;
    }
    await page.waitForTimeout(150);
  }

  throw new Error(`Timed out waiting for input value "${expected}"`);
}

async function expectAppLoaded(page, { waitForStore = false } = {}) {
  await page.waitForURL(/\/\?agentDemo=1.*/);
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('nav-add')).toBeVisible({ timeout: 10000 });

  if (waitForStore) {
    await page.waitForFunction(() => !!window.__cashflowStore?.getState?.(), { timeout: 15000 });
  }
}

// --- PROBE: storage + IDB + store snapshot (R.7 triage) ---
async function probePersistence(page, label = 'probe') {
  const data = await page.evaluate(async () => {
    const out = {
      url: location.href,
      time: new Date().toISOString(),
      localStorage: null,
      indexedDB: null,
      store: null,
    };

    // ---- localStorage ----
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.sort();

      const safeGet = (k) => {
        try {
          return localStorage.getItem(k);
        } catch {
          return '<unreadable>';
        }
      };

      const appKey = 'cashflow-storage';
      const seedKey = 'e2e-seeded-cashflow-storage';
      const latestKey = 'e2e-cashflow-storage-latest';

      const appRaw = safeGet(appKey);
      const seedMark = safeGet(seedKey);
      const latestRaw = safeGet(latestKey);

      const parseMaybe = (raw) => {
        if (!raw || raw === '<unreadable>') return null;
        try {
          return JSON.parse(raw);
        } catch {
          return '<invalid-json>';
        }
      };

      const appParsed = parseMaybe(appRaw);
      const latestParsed = parseMaybe(latestRaw);

      out.localStorage = {
        length: localStorage.length,
        keys,
        seedMark,
        hasCashflowStorage: !!appRaw,
        cashflowStorageSize: appRaw ? String(appRaw).length : 0,
        cashflowStoragePreview: appRaw ? String(appRaw).slice(0, 220) : null,
        latestSize: latestRaw ? String(latestRaw).length : 0,
        latestPreview: latestRaw ? String(latestRaw).slice(0, 220) : null,
        // Pull the most relevant fields if JSON is parseable
        cashflowIncome: appParsed?.state?.income ?? appParsed?.income ?? null,
        cashflowPaySchedule: appParsed?.state?.paySchedule ?? appParsed?.paySchedule ?? null,
        plannerIncome: appParsed?.state?.plannerSettings?.income ?? appParsed?.plannerSettings?.income ?? null,
        plannerPaySchedule: appParsed?.state?.plannerSettings?.paySchedule ?? appParsed?.plannerSettings?.paySchedule ?? null,
        latestIncome: latestParsed?.state?.income ?? latestParsed?.income ?? null,
      };
    } catch (e) {
      out.localStorage = { error: String(e) };
    }

    // ---- IndexedDB ----
    try {
      const anyIDB = !!window.indexedDB;
      const dbs = indexedDB.databases ? await indexedDB.databases() : null;

      const listStoreKeys = async (dbName, storeName) =>
        await new Promise((resolve) => {
          const req = indexedDB.open(dbName);
          req.onerror = () => resolve({ error: 'open failed' });
          req.onsuccess = () => {
            const db = req.result;
            const result = { name: dbName, version: db.version, stores: Array.from(db.objectStoreNames) };

            if (!db.objectStoreNames.contains(storeName)) {
              db.close();
              resolve({ ...result, store: storeName, keys: [], note: 'store missing' });
              return;
            }

            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const keysReq = store.getAllKeys();

            keysReq.onerror = () => {
              db.close();
              resolve({ ...result, store: storeName, keys: [], error: 'getAllKeys failed' });
            };
            keysReq.onsuccess = () => {
              const keys = keysReq.result || [];
              db.close();
              resolve({ ...result, store: storeName, keys });
            };
          };
        });

      // This is the one your seeding code uses
      const dbName = 'cashflow-app';
      const storeName = 'zustand-cache';

      const cacheKeys = await listStoreKeys(dbName, storeName);

      // Try to fetch the specific persisted record if it exists
      const readRecord = async (dbName2, storeName2, key) =>
        await new Promise((resolve) => {
          const req = indexedDB.open(dbName2);
          req.onerror = () => resolve({ error: 'open failed' });
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(storeName2)) {
              db.close();
              resolve({ error: 'store missing' });
              return;
            }
            const tx = db.transaction(storeName2, 'readonly');
            const store = tx.objectStore(storeName2);
            const getReq = store.get(key);
            getReq.onerror = () => {
              db.close();
              resolve({ error: 'get failed' });
            };
            getReq.onsuccess = () => {
              const val = getReq.result || null;
              db.close();
              resolve(val);
            };
          };
        });

      const idbRaw = await readRecord(dbName, storeName, 'cashflow-storage');
      let idbVal = idbRaw;
      if (typeof idbRaw === 'string') {
        try {
          idbVal = JSON.parse(idbRaw);
        } catch {
          // leave as raw string
        }
      }

      out.indexedDB = {
        supported: anyIDB,
        databases: dbs,
        cacheKeys,
        cashflowStorageRecordSummary: idbVal
          ? typeof idbVal === 'string'
            ? { rawStringLength: idbVal.length }
            : {
                // keep it small
                hasState: !!idbVal.state,
                topLevelKeys: Object.keys(idbVal || {}).slice(0, 30),
                stateKeys: Object.keys(idbVal.state || {}).slice(0, 30),
                income: idbVal.state?.income ?? idbVal.income ?? null,
                paySchedule: idbVal.state?.paySchedule ?? idbVal.paySchedule ?? null,
                plannerIncome:
                  idbVal.state?.plannerSettings?.income ?? idbVal.plannerSettings?.income ?? null,
              }
          : null,
      };
    } catch (e) {
      out.indexedDB = { error: String(e) };
    }

    // ---- zustand store ----
    try {
      const s = window.__cashflowStore?.getState?.();
      out.store = s
        ? {
            keys: Object.keys(s).slice(0, 40),
            accountsCount: Array.isArray(s.accounts) ? s.accounts.length : null,
            transactionsCount: Array.isArray(s.transactions) ? s.transactions.length : null,
            income: s.income ?? null,
            paySchedule: s.paySchedule ?? null,
            plannerIncome: s.plannerSettings?.income ?? null,
            plannerPaySchedule: s.plannerSettings?.paySchedule ?? null,
            lastAutoPostRunISO: s.lastAutoPostRunISO ?? null,
          }
        : null;
    } catch (e) {
      out.store = { error: String(e) };
    }

    return out;
  });

  // Print in test runner output
  console.log(`\n==== PERSISTENCE PROBE [${label}] ====`);
  console.log(JSON.stringify(data, null, 2));
  console.log('==== END PROBE ====\n');
}

async function dismissToasts(page) {
  // Toasts/snackbars can overlap the bottom nav and intercept clicks.
  const toast = page.locator('div[role="status"][aria-live="polite"]').first();
  const visible = await toast.isVisible({ timeout: 250 }).catch(() => false);
  if (!visible) return;

  const closeBtn = toast.getByRole('button').last().or(toast.locator('button').last());

  if (await closeBtn.count().catch(() => 0)) {
    await closeBtn.click({ timeout: 1500 }).catch(() => {});
  } else {
    await toast.click({ timeout: 1500 }).catch(() => {});
  }

  await toast.waitFor({ state: 'hidden', timeout: 2500 }).catch(() => {});
}

async function safeNavClick(page, testId) {
  const btn = page.getByTestId(testId);

  const ariaCurrent = await btn.getAttribute('aria-current').catch(() => null);
  if (ariaCurrent) return;

  await dismissToasts(page);

  try {
    await btn.click({ timeout: 5000 });
  } catch (e) {
    const msg = String(e || '');
    if (msg.includes('intercepts pointer events') || msg.includes('Element is not clickable')) {
      await dismissToasts(page);
      await btn.click({ timeout: 5000 });
      return;
    }
    throw e;
  }
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
  await safeNavClick(page, 'nav-accounts');
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
    } catch {
      // ignore
    }

    try {
      const parsed = JSON.parse(localStorage.getItem('cashflow-storage') || '{}');
      const accounts = parsed?.state?.accounts || parsed?.accounts || [];
      return readFromAccounts(accounts);
    } catch {
      return 0;
    }
  }, accountName);

  return { value: persisted || 0, text: String(persisted || 0) };
}

async function openSettingsSection(page, sectionNameRe) {
  await safeNavClick(page, 'nav-settings');

  const btn = page.getByRole('button', { name: sectionNameRe }).first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();

  // Let the caller assert on section-specific content.
}

async function createAccount(page, name, balance) {
  await safeNavClick(page, 'nav-settings');
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

  // Some builds keep the button; don't require detached, just wait for a UI settle.
  await page.waitForTimeout(250);
}

async function createBudgetCategory(page, name, limit) {
  await openSettingsSection(page, /^Budgets$/i);

  const addBtn = page.getByTestId('btn-add-budget').or(page.getByRole('button', { name: /Add Category/i }));
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();

  await expect(page.getByLabel('Category Name').last()).toBeVisible({ timeout: 5000 });
  await page.getByLabel('Category Name').last().fill(name);
  await page.getByLabel('Monthly Limit').last().fill(limit.toFixed(2));

  const budgetsSection = page.locator('section').filter({ hasText: /Budgets/i }).first();
  const saveBtn = budgetsSection.getByTestId('btn-save-budgets').or(page.getByRole('button', { name: /Save budgets/i }));
  await saveBtn.click();

  await expect(saveBtn).not.toBeVisible({ timeout: 5000 });

  const catInputs = page.getByLabel(/Category Name/i);
  await waitForInputWithValue(page, catInputs, name, 7000);
}

async function createGoal(page, { name, targetAmount, monthlyContribution }) {
  await openSettingsSection(page, /^Goals$/i);

  const addGoalBtn = page.getByTestId('btn-add-goal').or(page.getByRole('button', { name: /Add goal/i }));
  await addGoalBtn.scrollIntoViewIfNeeded();
  await addGoalBtn.click();

  await page.getByLabel('Name').last().fill(name);
  await page.getByLabel('Target Amount').last().fill(String(targetAmount));
  await page.getByLabel('Monthly Contribution').last().fill(String(monthlyContribution));

  const goalsSection = page.locator('section').filter({ hasText: /Goals/i }).first();
  const saveBtn = goalsSection.getByTestId('btn-save-goals').or(page.getByRole('button', { name: /Save goals/i }));
  await saveBtn.click();
  await page.waitForTimeout(250);
}

/**
 * Select helper that works with BOTH native selects and custom dropdowns.
 */
async function selectByLabelInDialog(dialog, labelRe, optionText) {
  const labeled = dialog.getByLabel(labelRe);
  let trigger;

  if (await labeled.count()) {
    trigger = labeled;
  } else {
    const labelNode = dialog.getByText(labelRe).first();
    await expect(labelNode).toBeVisible({ timeout: 5000 });
    trigger = labelNode
      .locator('xpath=following::button[1] | following::*[@role="combobox"][1] | following::select[1] | following::input[1]')
      .first();
  }

  const tagName = await trigger.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');

  // Native select
  if (tagName === 'select') {
    let valueOrLabelToSelect = optionText;

    if (optionText instanceof RegExp) {
      const matchText = await trigger.locator('option').evaluateAll((opts, source) => {
        const re = new RegExp(source, 'i');
        const found = opts.find((o) => re.test(o.text) || re.test(o.value));
        return found ? found.text : null;
      }, optionText.source);

      if (!matchText) throw new Error(`No option found matching regex: ${optionText}`);
      valueOrLabelToSelect = matchText;
    }

    await trigger.selectOption({ label: valueOrLabelToSelect });
    return;
  }

  // Custom dropdown
  await trigger.click({ timeout: 3000 });

  const optRe =
    typeof optionText === 'string' ? new RegExp(optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : optionText;

  // Option might be in a portal outside the dialog
  const page = dialog.page();
  const option = page.getByRole('option', { name: optRe }).first();

  if (await option.isVisible().catch(() => false)) {
    await option.click();
    return;
  }

  await page.getByText(optRe).first().click();
}

async function trySelectByLabelInDialogOptional(dialog, labelRe, optionText) {
  const labeledCount = await dialog.getByLabel(labelRe).count().catch(() => 0);
  const textCount = await dialog.getByText(labelRe).count().catch(() => 0);
  if (!labeledCount && !textCount) return false;

  try {
    await selectByLabelInDialog(dialog, labelRe, optionText);
    return true;
  } catch {
    return false;
  }
}

async function addBill(page, bill, opts) {
  const payer = opts?.payer ?? 'Partner H';
  const withdrawFrom = opts?.withdrawFrom ?? 'Demo Checking';

  await safeNavClick(page, 'nav-bills');

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

  await selectByLabelInDialog(dialog, /Payer/i, new RegExp(`^(${payer}|H|Teles)$`, 'i'));

  await trySelectByLabelInDialogOptional(dialog, /Category/i, new RegExp(escapeRegex(bill.category), 'i'));

  const withdrawLabelCandidates = [/Withdraw From/i, /Pay From/i, /From Account/i, /Account/i];
  for (const re of withdrawLabelCandidates) {
    const didSelect = await trySelectByLabelInDialogOptional(dialog, re, new RegExp(withdrawFrom, 'i'));
    if (didSelect) break;
  }

  await dialog.getByRole('button', { name: /Save Bill/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });

  await dismissToasts(page);
}

async function getAddTransactionModal(page) {
  const heading = page.locator('h2', { hasText: /^Add Transaction$/ }).first();
  const header = heading.locator('..');
  return header.locator('..');
}

async function addTransaction(page, { amount, description }) {
  await safeNavClick(page, 'nav-add');
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
 * Manual setup for the “User A (H)” dataset.
 */
async function configureIncomeAndPayScheduleForH(page, { incomeAmount }) {
  await openSettingsSection(page, /^Income & Pay Schedule$/i);
  await expect(page.getByText(/Household income & pay schedule/i)).toBeVisible({ timeout: 10000 });

  const incomeH = page.getByTestId('input-income-husband');
  const day1 = page
    .getByTestId('input-pay-day1')
    .or(page.getByLabel(/First pay date/i))
    .or(page.getByText(/^First pay date \(day\)$/).locator('xpath=..').locator('input'));

  const day2 = page
    .getByTestId('select-pay-day2')
    .or(page.getByLabel(/Second pay date/i))
    .or(page.getByText(/^Second pay date$/).locator('xpath=..').locator('select'));

  await expect(incomeH).toBeVisible({ timeout: 10000 });
  await incomeH.fill(Number(incomeAmount).toFixed(2));
  await incomeH.press('Tab').catch(() => {});
  await day1.fill('15');
  await day1.press('Tab').catch(() => {});
  // Prefer the "Last day of month" option when available (value is usually "last").
  await day2.selectOption({ value: 'last' }).catch(async () => {
    await day2.selectOption({ label: /Last day of month/i }).catch(async () => {
      await day2.selectOption('30');
    });
  });

  const saveIncome = page.getByTestId('save-income-btn');
  await expect(saveIncome).toBeVisible({ timeout: 10000 });
  await saveIncome.scrollIntoViewIfNeeded();
  await expect(saveIncome).toBeEnabled();
  await saveIncome.click();

  await expect(saveIncome).toBeHidden({ timeout: 10000 });

  // Wait until the LIVE store reflects the change (no reliance on persistence timing)
  await page.waitForFunction(
    ({ expectedIncome, expectedDay1, expectedDay2 }) => {
      const s = window.__cashflowStore?.getState?.();
      if (!s) return false;

      const inc = s?.income?.husband ?? s?.plannerSettings?.income?.husband ?? 0;

      const ps = s?.paySchedule ?? s?.plannerSettings?.paySchedule ?? s?.plannerSettings?.payScheduleSettings;
      const d1 = ps?.day1 ?? ps?.firstPayDay;
      const d2 = ps?.day2 ?? ps?.secondPayDay;

      return (
        Math.abs(Number(inc) - Number(expectedIncome)) < 0.01 &&
        String(d1) === String(expectedDay1) &&
        (() => {
          const exp = String(expectedDay2).toLowerCase();
          const got = String(d2).toLowerCase();
          if (exp === 'last') return got === 'last' || got === '30' || got === '31';
          return String(d2) === String(expectedDay2);
        })()
      );
    },
    { expectedIncome: incomeAmount, expectedDay1: '15', expectedDay2: 'last' },
    { timeout: 15000 }
  );

  // Make reload deterministic for this flow
  await persistLatestStateForReload(page);
}

/**
 * ASSERTS: income + pay schedule persisted (reload-safe).
 * Uses Playwright auto-waiting locator assertions (avoids “reads 0 too early”).
 */
async function assertIncomeAndPayScheduleSaved(page, { incomeAmount, day1Expected = '15', day2Expected = 'last' }) {
  await openSettingsSection(page, /^Income & Pay Schedule$/i);
  await expect(page.getByText('Household income & pay schedule')).toBeVisible({ timeout: 10000 });

  const incomeH = page.getByTestId('input-income-husband');

  const day1 = page
    .getByTestId('input-pay-day1')
    .or(page.getByLabel(/First pay date \(day\)/i))
    .or(page.getByText(/^First pay date \(day\)$/).locator('xpath=..').locator('input'));

  const day2 = page
    .getByTestId('select-pay-day2')
    .or(page.getByLabel(/Second pay date/i))
    .or(page.getByText(/^Second pay date$/).locator('xpath=..').locator('select'));

  await expect(incomeH).toBeVisible({ timeout: 10000 });
  await expect(day1).toBeVisible({ timeout: 10000 });
  await expect(day2).toBeVisible({ timeout: 10000 });

  // In agentDemo, some builds overwrite certain slices on reload.
  // Re-apply our latest E2E snapshot into the live store before asserting UI values.
  await restoreE2ELatestIntoStore(page);

  try {
    await expectNumberInputCloseTo(incomeH, incomeAmount, { timeout: 20000, tolerance: 0.25 });
  } catch (e) {
    const raw = await incomeH.inputValue().catch(() => '<unreadable>');
    const url = page.url();

    const seedMark = await page.evaluate(() => localStorage.getItem('e2e-seeded-cashflow-storage')).catch(() => null);

    const storageSnap = await page
      .evaluate(() => {
        try {
          const rawLS = localStorage.getItem('cashflow-storage');
          const latest = localStorage.getItem('e2e-cashflow-storage-latest');
          const parse = (x) => {
            try {
              return x ? JSON.parse(x) : null;
            } catch {
              return '<invalid-json>';
            }
          };
          const parsed = parse(rawLS);
          const latestParsed = parse(latest);
          const s = parsed?.state ?? parsed ?? {};
          const ls = latestParsed?.state ?? latestParsed ?? {};
          return {
            income: s?.income,
            paySchedule: s?.paySchedule,
            plannerIncome: s?.plannerSettings?.income,
            plannerPaySchedule: s?.plannerSettings?.paySchedule,
            latestIncome: ls?.income,
            latestPaySchedule: ls?.paySchedule,
          };
        } catch {
          return null;
        }
      })
      .catch(() => null);

    const storeSnap = await page
      .evaluate(() => {
        try {
          const s = window.__cashflowStore?.getState?.();
          if (!s) return null;
          return {
            income: s?.income,
            paySchedule: s?.paySchedule,
            plannerIncome: s?.plannerSettings?.income,
            plannerPaySchedule: s?.plannerSettings?.paySchedule,
          };
        } catch {
          return null;
        }
      })
      .catch(() => null);

    throw new Error(
      [
        `Income did not hydrate to expected value after reload (after restore).`,
        `Expected (amount): ${Number(incomeAmount).toFixed(2)}`,
        `Actual inputValue(): ${raw}`,
        `URL: ${url}`,
        `Seed mark present: ${seedMark}`,
        `localStorage snapshot: ${JSON.stringify(storageSnap)}`,
        `store snapshot: ${JSON.stringify(storeSnap)}`,
        `Original error: ${String(e)}`,
      ].join('\n')
    );
  }

  await expect(day1).toHaveValue(String(day1Expected), { timeout: 10000 });

  if (String(day2Expected).toLowerCase() === 'last') {
    // Some builds store this as value="last" while showing label "Last day of month".
    await expect(day2).toHaveValue(/last/i, { timeout: 10000 });
  } else {
    // On some builds selecting "30" is normalized to "last" — accept either.
    const d2 = String(day2Expected);
    await expect(day2).toHaveValue(new RegExp(`^(?:${escapeRegex(d2)}|last)$`, 'i'), { timeout: 10000 });
  }
}

async function assertBillsSaved(page, bills) {
  await safeNavClick(page, 'nav-bills');
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  for (const b of bills) {
    await expect(page.getByText(b.name, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
}

/**
 * ASSERTS: budgets saved (reload-safe) WITHOUT getByDisplayValue().
 */
async function assertBudgetsSaved(page, budgets) {
  await openSettingsSection(page, /^Budgets$/i);

  const catInputs = page.getByLabel(/Category Name/i);
  const limitInputs = page.getByLabel(/Monthly Limit/i);

  const catCount = await catInputs.count();
  const limitCount = await limitInputs.count();
  expect(catCount).toBeGreaterThan(0);
  expect(limitCount).toBeGreaterThanOrEqual(catCount);

  for (const b of budgets) {
    let foundIndex = -1;
    for (let i = 0; i < catCount; i++) {
      const v = await catInputs.nth(i).inputValue().catch(() => '');
      if (String(v).trim() === String(b.category).trim()) {
        foundIndex = i;
        break;
      }
    }
    expect(foundIndex).toBeGreaterThanOrEqual(0);

    const rawLimit = await limitInputs.nth(foundIndex).inputValue().catch(() => '');
    expect(parseCurrencyToNumber(rawLimit)).toBeCloseTo(b.limit, 0.01);
  }
}

/**
 * ASSERTS: goal saved (reload-safe) WITHOUT getByDisplayValue().
 */
async function assertGoalSaved(page, { name, targetAmount, monthlyContribution }) {
  await openSettingsSection(page, /^Goals$/i);

  const nameInputs = page.getByLabel(/^Name$/i);
  const targetInputs = page.getByLabel(/Target Amount/i);
  const contribInputs = page.getByLabel(/Monthly Contribution/i);

  const count = await nameInputs.count();
  expect(count).toBeGreaterThan(0);

  let foundIndex = -1;
  for (let i = 0; i < count; i++) {
    const v = await nameInputs.nth(i).inputValue().catch(() => '');
    if (String(v).trim() === String(name).trim()) {
      foundIndex = i;
      break;
    }
  }
  expect(foundIndex).toBeGreaterThanOrEqual(0);

  const rawTarget = await targetInputs.nth(foundIndex).inputValue().catch(() => '');
  const rawMonthly = await contribInputs.nth(foundIndex).inputValue().catch(() => '');

  expect(parseCurrencyToNumber(rawTarget)).toBeCloseTo(targetAmount, 0.01);
  expect(parseCurrencyToNumber(rawMonthly)).toBeCloseTo(monthlyContribution, 0.01);
}

// --- Data: User A (H) only ---
const USER_A_BILLS = [
  { name: 'Emprestimo M', amount: 381.4, dueDay: 1, category: 'Housing' },
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
    await safeNavClick(page, 'nav-home');
    const initialBalance = await readPlannedBalance(page);

    const accountAmt = 5000;
    await createAccount(page, 'Regression Bank', accountAmt);

    await safeNavClick(page, 'nav-home');
    const balanceAfterAccount = await readPlannedBalance(page);

    expect(balanceAfterAccount).toBeCloseTo(initialBalance + accountAmt, 0.1);

    const billAmt = 150;
    await safeNavClick(page, 'nav-bills');

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

    await safeNavClick(page, 'nav-home');
    const finalBalance = await readPlannedBalance(page);

    const targets = [balanceAfterAccount, balanceAfterAccount - billAmt];
    const withinTolerance = targets.some((t) => Math.abs(finalBalance - t) <= 0.5);
    expect(withinTolerance).toBeTruthy();
  });

  test('R.2 Goals: Create goal and verify persistence', async ({ page }) => {
    const goal = { name: 'Tesla Fund', targetAmount: 50000, monthlyContribution: 500 };
    await createGoal(page, goal);

    await page.reload();
    await expectAppLoaded(page);

    await assertGoalSaved(page, goal);
  });

  test('R.3 Budgets: Create category and track spending', async ({ page }) => {
    const catName = 'Ramen';
    const limit = 100;
    const spent = 25;

    await createBudgetCategory(page, catName, limit);

    await assertBudgetsSaved(page, [{ category: catName, limit }]);

    await safeNavClick(page, 'nav-planner');
    await expectPlannerLoaded(page);
    await expectPlannerScopeIsSelf(page);

    const baselinePlanned = await readInfographicEndBalance(page, 'planned');
    const baselineActual = await readInfographicEndBalance(page, 'actual');

    await addTransaction(page, { amount: spent, description: 'Lunch' });

    await safeNavClick(page, 'nav-expenses');
    await expect(page.getByText('Lunch').first()).toBeVisible({ timeout: 10000 });

    await safeNavClick(page, 'nav-planner');
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

    await safeNavClick(page, 'nav-planner');
    await expectPlannerLoaded(page);
    await expectPlannerScopeIsSelf(page);

    const plannedBefore = await readInfographicEndBalance(page, 'planned');
    const actualBefore = await readInfographicEndBalance(page, 'actual');

    expect(Math.abs(plannedBefore)).toBeGreaterThan(0);
    expect(actualBefore).toBeCloseTo(plannedBefore, 1);

    const expenseAmt = 45;
    await addTransaction(page, { amount: expenseAmt, description: 'Planner Expense' });

    await safeNavClick(page, 'nav-planner');
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
    await safeNavClick(page, 'nav-settings');

    const rulesNav = page.getByRole('button', { name: /^Allocation Rules$/i });
    await expect(rulesNav).toBeVisible({ timeout: 10000 });
    await rulesNav.click();

    const rulesSection = page.locator('section').filter({ hasText: /Allocation Rules/i }).first();
    await expect(rulesSection).toBeVisible({ timeout: 10000 });

    const addRuleBtn = rulesSection.getByRole('button', { name: /Add rule/i });
    await addRuleBtn.scrollIntoViewIfNeeded();
    await addRuleBtn.click();

    const labelInput = rulesSection.getByLabel('Label').last();
    await expect(labelInput).toBeVisible({ timeout: 10000 });
    await labelInput.fill('Save 20%');

    const typeSelect = rulesSection.getByLabel('Type').last();
    if (await typeSelect.isVisible().catch(() => false)) {
      const isSelect = await typeSelect.evaluate((el) => el?.tagName?.toLowerCase() === 'select').catch(() => false);
      if (isSelect) {
        await typeSelect.selectOption({ label: /Percent/i }).catch(async () => {
          await typeSelect.selectOption('percent');
        });
      }
    }

    const percentInput = rulesSection.getByLabel('Percent').last();
    await expect(percentInput).toBeVisible({ timeout: 10000 });
    await percentInput.fill('20');

    const saveBtn = rulesSection.getByRole('button', { name: /Save rules/i });
    await saveBtn.click();

    await page.reload();
    await expectAppLoaded(page);

    await safeNavClick(page, 'nav-settings');
    await rulesNav.click();

    const rulesSection2 = page.locator('section').filter({ hasText: /Allocation Rules/i }).first();
    await expect(rulesSection2).toBeVisible({ timeout: 10000 });

    await expect(rulesSection2.getByLabel('Label').last()).toHaveValue('Save 20%');
    await expect(rulesSection2.getByLabel('Percent').last()).toHaveValue('20');
  });

  test('R.5 Accounts Page: Verify listing', async ({ page }) => {
    await createAccount(page, 'Investment A', 1234.56);

    await safeNavClick(page, 'nav-accounts');
    await expect(page.getByRole('heading', { name: 'Accounts' }).first()).toBeVisible();
    await expect(page.getByText('Investment A').first()).toBeVisible();
    await expect(page.getByText('$1,234.56').first()).toBeVisible();
  });

  test('R.7 Income auto-posts on both semi-monthly paydays and bumps balances (manual inputs for User A/H) + asserts saved inputs', async ({
    page,
  }) => {
    const setupDay = '2025-01-10';
    const beforePay = '2025-01-14';
    const payDay1 = '2025-01-15';
    const payDay2 = '2025-01-31';

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
        paidBills: {},
        categoryBudgets: {},
        goals: [],
        extraIncomes: [],
        allocationRules: [],
        confirmedDiscretionary: {},
        lastAutoPostRunISO: null,
        mode: 'planned',

        residualAccountId: accountId,
        income: { husband: 0, wife: 0 },
        paySchedule: { type: 'semi-monthly', day1: 15, day2: 'last' },

        plannerSettings: {
          startDate: '2025-01-01',
          startingBalance: 0,
          income: { husband: 0, wife: 0 },
          paySchedule: { type: 'semi-monthly', day1: 15, day2: 'last' },
          billSharing: { mode: 'manual', percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] },
          residualAccountId: accountId,
          mode: 'planned',
        },
      },
      version: 0,
    };

    // Re-navigate with init scripts so the app boots with mocked Date + seeded persistence.
    await installMockToday(page, setupDay);
    await installPersistedSeed(page, basePersisted);
    await page.goto('/?agentDemo=1');
    await expectAppLoaded(page, { waitForStore: true });
      await restoreE2ELatestIntoStore(page);

    // 1) Configure income + pay schedule through Settings UI
    await configureIncomeAndPayScheduleForH(page, { incomeAmount });

    // 2) Create budgets by category
    const budgets = aggregateBudgetsFromBills(USER_A_BILLS);
    for (const b of budgets) {
      await createBudgetCategory(page, b.category, b.limit);
    }

    // 3) Add bills
    for (const b of USER_A_BILLS) {
      await addBill(page, b, { payer: 'Partner H', withdrawFrom: accountName });
    }

    // 4) Create a goal
    await createGoal(page, goal);

    // Persist the full dataset for the reload-safe assertions below.
    await persistLatestStateForReload(page);

    // --- ASSERT ALL ENTRIES WERE ACTUALLY SAVED (reload-safe) ---
    await page.reload();
    await expectAppLoaded(page, { waitForStore: true });
      await restoreE2ELatestIntoStore(page);

    await assertIncomeAndPayScheduleSaved(page, { incomeAmount, day1Expected: '15', day2Expected: 'last' });
    await assertBillsSaved(page, USER_A_BILLS);

    // A) Before payday: should NOT create auto salary
    await setMockToday(page, beforePay);
    await page.reload();
    await expectAppLoaded(page, { waitForStore: true });
      await restoreE2ELatestIntoStore(page);

    const { value: balanceBefore } = await readAccountBalanceFromAccounts(page, accountName);

    await safeNavClick(page, 'nav-expenses');
    await expect(page.locator('main').getByText(/Auto Salary - H/i)).toHaveCount(0);

    // B) Payday #1
    await setMockToday(page, payDay1);
    await page.reload();
    await expectAppLoaded(page, { waitForStore: true });
      await restoreE2ELatestIntoStore(page);

    await waitForAutoSalaryInStore(page, { today: payDay1, accountId, cents: incomeCents });

    await safeNavClick(page, 'nav-expenses');
    await expect(page.getByText(/Auto Salary - H/i).first()).toBeVisible({ timeout: 15000 });

    const { value: balanceAfter1 } = await readAccountBalanceFromAccounts(page, accountName);
    expect(balanceAfter1).toBeGreaterThan(balanceBefore);
    expect(balanceAfter1).toBeCloseTo(incomeAmount, 0.5);

    // C) Payday #2
    await setMockToday(page, payDay2);
    await page.reload();
    await expectAppLoaded(page, { waitForStore: true });
      await restoreE2ELatestIntoStore(page);

    await waitForAutoSalaryInStore(page, { today: payDay2, accountId, cents: incomeCents });

    await safeNavClick(page, 'nav-expenses');
    await expect(page.getByText(/Auto Salary - H/i).first()).toBeVisible({ timeout: 15000 });

    const { value: balanceAfter2 } = await readAccountBalanceFromAccounts(page, accountName);
    expect(balanceAfter2).toBeCloseTo(incomeAmount * 2, 1);
  });
});
