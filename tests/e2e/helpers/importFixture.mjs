import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";

const FIXED_START_DATE = "2025-01-01";
const DEFAULT_FIXTURE_PATH = path.join(process.cwd(), "tests", "fixtures", "budget_import.csv");
const DEFAULT_PAY_SCHEDULE = { type: "semi-monthly", day1: 15, day2: "last" };

const KNOWN_HEADERS = new Set([
  "section",
  "type",
  "kind",
  "name",
  "title",
  "description",
  "total_amount",
  "amount",
  "value",
  "opening_balance",
  "balance",
  "due_day",
  "due",
  "day",
  "date",
  "pay_day",
  "user_a",
  "user_b",
  "user_a_teles",
  "user_b_nicole",
  "teles",
  "nicole",
  "husband",
  "wife",
  "category",
  "budget_category",
  "goal_category",
  "account",
  "account_name",
  "account_id",
  "bank",
  "payer",
  "owner",
  "assigned_to",
  "payor",
  "status",
  "paid",
  "is_paid",
  "monthly_contribution",
  "per_month",
  "contribution",
  "target_amount",
]);

const SECTION_ALIASES = ["section", "type", "item_type", "kind", "category_type"];
const NAME_ALIASES = ["name", "title", "description", "label"];
const AMOUNT_ALIASES = ["total_amount", "amount", "value", "opening_balance", "balance", "budget", "budget_amount", "monthly_limit", "target_amount"];
const DUE_DAY_ALIASES = ["due_day", "due", "day", "date", "due_date", "pay_day"];
const CATEGORY_ALIASES = ["category", "budget_category", "goal_category", "type_category"];
const ACCOUNT_ALIASES = ["account", "account_name", "account_id", "bank"];
const PAYER_ALIASES = ["payer", "owner", "assigned_to", "payor"];
const STATUS_ALIASES = ["status", "paid", "is_paid"];
const USER_A_ALIASES = ["user_a", "user_a_(teles)", "user_a_teles", "teles", "husband", "partner_a"];
const USER_B_ALIASES = ["user_b", "user_b_(nicole)", "user_b_nicole", "nicole", "wife", "partner_b"];
const CONTRIBUTION_ALIASES = ["monthly_contribution", "per_month", "contribution", "saving"];

const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));

const normalizeHeader = (key) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildLookup = (row) => {
  const lookup = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    lookup[normalizeHeader(key)] = value;
  });
  return lookup;
};

const pickValue = (lookup, aliases) => {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (lookup[key] !== undefined && lookup[key] !== null && String(lookup[key]).trim() !== "") {
      return lookup[key];
    }
  }
  return undefined;
};

const parseMoney = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const toCents = (amount) => Math.round(parseMoney(amount) * 100);

const coerceDay = (value) => {
  const num = Number.parseInt(String(value || "").replace(/[^0-9]+/g, ""), 10);
  if (!Number.isFinite(num)) return null;
  return clamp(num, 1, 31);
};

const buildIsoDateFromDay = (day, startDate = FIXED_START_DATE) => {
  const base = new Date(`${startDate}T00:00:00`);
  const maxDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const safeDay = clamp(Number.isFinite(day) ? day : 1, 1, maxDay);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const slugify = (value, fallback = "item") => {
  const base = String(value || fallback || "item").toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const isTruthy = (val) => {
  if (typeof val === "boolean") return val;
  const normalized = String(val || "").trim().toLowerCase();
  return ["true", "yes", "y", "paid", "done", "1"].includes(normalized);
};

const detectRowType = ({ typeHint, hasDueDay, hasUserSplit, hasContribution, categoryPresent }) => {
  const hint = String(typeHint || "").toLowerCase();
  if (hint.includes("income")) return "income";
  if (hint.includes("bill") || hint.includes("recurring")) return "bill";
  if (hint.includes("expense") || hint.includes("transaction")) return "expense";
  if (hint.includes("budget")) return "budget";
  if (hint.includes("goal")) return "goal";
  if (hint.includes("account")) return "account";
  if (hasDueDay) return "bill";
  if (hasContribution) return "goal";
  if (categoryPresent && hasUserSplit) return "expense";
  return null;
};

const inferPartnerLabel = (header, fallback) => {
  const match = String(header || "").match(/\(([^)]+)\)/);
  return (match && match[1] && match[1].trim()) || fallback;
};

const inferPayer = (raw, userA, userB) => {
  const normalized = String(raw || "").toLowerCase();
  if (normalized.includes("husband") || normalized.includes("teles") || normalized === "h") return "H";
  if (normalized.includes("wife") || normalized.includes("nicole") || normalized === "w") return "W";
  if (userA > 0 && userB === 0) return "H";
  if (userB > 0 && userA === 0) return "W";
  return "Shared";
};

const makeAccount = ({ id, name, openingBalance = 0, ownerRole = "H", type = "deposit" }) => {
  const cents = toCents(openingBalance);
  return {
    id,
    name,
    type,
    openingBalance,
    openingBalanceCents: cents,
    balance: openingBalance,
    balanceCents: cents,
    currentBalance: openingBalance,
    currentBalanceCents: cents,
    ownerRole,
  };
};

export async function loadBudgetImportCsv(fixturePath = DEFAULT_FIXTURE_PATH) {
  const csvText = await fs.readFile(fixturePath, "utf8");
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = Array.isArray(parsed.data) ? parsed.data.map((r) => r || {}) : [];
  const meta = parsed.meta || {};
  return { rows, meta, path: fixturePath };
}

export function buildSeedStateFromBudgetImport(rowsInput, options = {}) {
  const rows = Array.isArray(rowsInput)
    ? rowsInput
    : Array.isArray(rowsInput?.rows)
      ? rowsInput.rows
      : [];
  const meta = options.meta || rowsInput?.meta || rowsInput?.__meta || {};
  const headersFromMeta = options.headers || meta.fields || [];
  const headers =
    headersFromMeta.length > 0
      ? headersFromMeta
      : Array.from(
          rows.reduce((set, row) => {
            Object.keys(row || {}).forEach((k) => set.add(k));
            return set;
          }, new Set())
        );

  const normalizedHeaders = headers.map(normalizeHeader);
  const unmappedColumns = Array.from(
    new Set(normalizedHeaders.filter((h) => h && !KNOWN_HEADERS.has(h)))
  );

  let partnerALabel = "Partner A";
  let partnerBLabel = "Partner B";
  headers.forEach((header) => {
    const lower = String(header || "").toLowerCase();
    if (lower.includes("user a")) partnerALabel = inferPartnerLabel(header, partnerALabel);
    if (lower.includes("user b")) partnerBLabel = inferPartnerLabel(header, partnerBLabel);
  });

  const importDebug = {
    source: options.sourcePath || rowsInput?.path || DEFAULT_FIXTURE_PATH,
    headers,
    normalizedHeaders,
    unmappedColumns,
    unmappedRows: [],
  };

  const accounts = [];
  const bills = [];
  const expenses = [];
  const extraIncomes = [];
  const goals = [];
  const paidBills = {};
  const splitTotals = { H: 0, W: 0 };

  let sawUserB = false;
  let totalIncomeAmount = 0;

  const ensureAccountForRole = (role) => {
    const existing = accounts.find((a) => a.ownerRole === role);
    if (existing) return existing;
    const name = role === "W" ? `${partnerBLabel} Checking` : `${partnerALabel} Checking`;
    const id = role === "W" ? "acct-import-w" : "acct-import-h";
    const acct = makeAccount({ id, name, ownerRole: role });
    accounts.push(acct);
    return acct;
  };

  rows.forEach((row, idx) => {
    const lookup = buildLookup(row);
    const typeHint = pickValue(lookup, SECTION_ALIASES);
    const name = pickValue(lookup, NAME_ALIASES) || `Item ${idx + 1}`;
    const amount = parseMoney(pickValue(lookup, AMOUNT_ALIASES));
    const userA = parseMoney(pickValue(lookup, USER_A_ALIASES));
    const userB = parseMoney(pickValue(lookup, USER_B_ALIASES));
    if (userB > 0) sawUserB = true;
    const dueDay = coerceDay(pickValue(lookup, DUE_DAY_ALIASES));
    const category = pickValue(lookup, CATEGORY_ALIASES);
    const payerRaw = pickValue(lookup, PAYER_ALIASES);
    const statusRaw = pickValue(lookup, STATUS_ALIASES);
    const contribution = parseMoney(pickValue(lookup, CONTRIBUTION_ALIASES));

    const rowType = detectRowType({
      typeHint,
      hasDueDay: dueDay !== null,
      hasUserSplit: userA > 0 || userB > 0,
      hasContribution: contribution > 0,
      categoryPresent: Boolean(category),
    });

    if (!rowType) {
      importDebug.unmappedRows.push({ index: idx, reason: "unknown-section", row });
      return;
    }

    if (rowType === "account") {
      const ownerRole = inferPayer(payerRaw, userA, userB) === "W" ? "W" : "H";
      const opening = amount || userA || userB || 0;
      const account = makeAccount({
        id: slugify(name, `acct-${idx + 1}`),
        name,
        openingBalance: opening,
        ownerRole,
      });
      accounts.push(account);
      return;
    }

    if (rowType === "income") {
      const incomeAmount = amount || userA + userB;
      totalIncomeAmount += incomeAmount;
      const payer = inferPayer(payerRaw, userA, userB);
      const account = payer === "W" ? ensureAccountForRole("W") : ensureAccountForRole("H");
      extraIncomes.push({
        id: slugify(name, `income-${idx + 1}`),
        description: name,
        amount: incomeAmount,
        amountCents: toCents(incomeAmount),
        category: category || "Income",
        accountId: account?.id || null,
        payer,
        day: dueDay || null,
      });
      return;
    }

    if (rowType === "budget") {
      const key = slugify(name, `category-${idx + 1}`);
      categoryBudgets[key] = {
        label: name,
        amount,
        amountCents: toCents(amount),
        scope: "shared",
        owner: null,
        accountId: null,
      };
      return;
    }

    if (rowType === "goal") {
      const ownerRole = inferPayer(payerRaw, userA, userB) === "W" ? "W" : "H";
      goals.push({
        id: slugify(name, `goal-${idx + 1}`),
        name,
        targetAmount: amount || contribution || 0,
        targetAmountCents: toCents(amount || contribution || 0),
        perMonth: contribution || userA + userB || 0,
        contributions: { H: userA || 0, W: userB || 0 },
        status: "active",
        scope: "personal",
        owner: ownerRole,
        startDate: FIXED_START_DATE,
        endDate: "",
        accountId: null,
      });
      return;
    }

    if (rowType === "bill") {
      const payer = inferPayer(payerRaw, userA, userB);
      const account =
        payer === "W" ? ensureAccountForRole("W") : ensureAccountForRole("H");
      const billAmount = amount || userA + userB;
      const bill = {
        id: slugify(name, `bill-${idx + 1}`),
        name,
        amount: billAmount,
        amountCents: toCents(billAmount),
        dueDay: dueDay || 1,
        payer,
        category: category || null,
        accountId: account?.id || null,
        isShared: payer === "Shared",
      };
      bills.push(bill);
      if (payer === "Shared") {
        splitTotals.H += userA || 0;
        splitTotals.W += userB || 0;
      }
      if (isTruthy(statusRaw)) {
        const key = `${buildIsoDateFromDay(bill.dueDay)}:${bill.id}`;
        paidBills[key] = true;
      }
      return;
    }

    if (rowType === "expense") {
      const payer = inferPayer(payerRaw, userA, userB);
      const account =
        payer === "W" ? ensureAccountForRole("W") : ensureAccountForRole("H");
      const amt = amount || userA + userB;
      const expense = {
        id: slugify(name, `tx-${idx + 1}`),
        description: name,
        amount: amt,
        amountCents: toCents(amt),
        category: category || null,
        date: buildIsoDateFromDay(dueDay || 1),
        type: "expense",
        accountId: account?.id || null,
      };
      expenses.push(expense);
      return;
    }

    importDebug.unmappedRows.push({ index: idx, reason: `unhandled-${rowType}`, row });
  });

  if (accounts.length === 0) {
    const baseBalance = totalIncomeAmount || 0;
    accounts.push(
      makeAccount({
        id: "acct-import-h",
        name: `${partnerALabel} Checking`,
        openingBalance: baseBalance,
        ownerRole: "H",
      })
    );
    if (sawUserB) {
      accounts.push(
        makeAccount({
          id: "acct-import-w",
          name: `${partnerBLabel} Checking`,
          openingBalance: 0,
          ownerRole: "W",
        })
      );
    }
  }

  const residualAccountId = accounts[0]?.id || null;
  bills.forEach((bill) => {
    if (!bill.accountId) bill.accountId = residualAccountId;
  });
  expenses.forEach((tx) => {
    if (!tx.accountId) tx.accountId = residualAccountId;
  });

  const startingBalance = accounts.reduce(
    (sum, acc) => sum + (Number(acc.openingBalance) || 0),
    0
  );

  const sharedTotal = (splitTotals.H || 0) + (splitTotals.W || 0);
  const billSharing =
    sharedTotal > 0
      ? {
          mode: "percentage",
          percentageSplit: {
            H: clamp(splitTotals.H / sharedTotal),
            W: clamp(splitTotals.W / sharedTotal),
          },
          sharedBillIds: [],
        }
      : {
          mode: "manual",
          percentageSplit: { H: 0.5, W: 0.5 },
          sharedBillIds: [],
        };

  return {
    plannerSettings: {
      startDate: FIXED_START_DATE,
      startingBalance,
      paySchedule: DEFAULT_PAY_SCHEDULE,
      residualAccountId,
      mode: "planned",
    },
    startDate: FIXED_START_DATE,
    startingBalance,
    paySchedule: DEFAULT_PAY_SCHEDULE,
    residualAccountId,
    accounts,
    recurringBills: bills,
    transactions: expenses,
    expenses,
    goals,
    categoryBudgets,
    extraIncomes,
    allocationRules: [],
    paidBills,
    billSharing,
    mode: "planned",
    __importDebug: importDebug,
  };
}

export async function seedStoreFromBudgetImport(page, options = {}) {
  const fixturePath = options.fixturePath || DEFAULT_FIXTURE_PATH;
  const { rows, meta } = await loadBudgetImportCsv(fixturePath);
  const seedState = buildSeedStateFromBudgetImport(rows, {
    meta,
    sourcePath: fixturePath,
  });

  await page.waitForFunction(() => !!window.__cashflowStore?.getState?.(), {
    timeout: options.waitForStoreTimeout || 10000,
  });

  await page.evaluate((state) => {
    const store = window.__cashflowStore;
    if (!store?.getState) return;
    const s = store.getState();
    if (typeof s.setFullPlanData === "function") {
      s.setFullPlanData(state);
    }
    if (typeof s.setHasHydrated === "function") {
      s.setHasHydrated(true);
    } else if (store.setState) {
      store.setState({ hasHydrated: true }, false);
    }
  }, seedState);

  return seedState;
}
