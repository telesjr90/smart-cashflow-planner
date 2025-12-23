// tests/e2e/helpers/seedFromBudgetImportCsv.mjs
import fs from "fs";
import path from "path";

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;

  // Clean currency-ish / quoted values: "$2,300.00" -> 2300.00
  const cleaned = String(v).trim().replace(/[^0-9.-]+/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function slugId(prefix, name) {
  return `${prefix}-${String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)}`;
}

function parseDayOrLast(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^last$/i.test(s)) return "last";
  const n = parseInt(s, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 31) return n;
  return null;
}

// Split by comma ONLY if not inside quotes (supports embedded commas).
function splitCsvLine(line) {
  return String(line)
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((c) => c.trim())
    .map((c) => {
      // Strip surrounding quotes + unescape double-quotes
      const stripped = c.replace(/^"|"$/g, "");
      return stripped.replace(/""/g, '"').trim();
    });
}

// Minimal CSV parser aligned with app import expectations (supports quoted cells).
function parseCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "") // strip BOM
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((s) => s.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    header.forEach((h, idx) => (row[h] = (cols[idx] ?? "").trim()));
    rows.push(row);
  }
  return rows;
}

export function loadBudgetImportRows() {
  const csvPath = path.join(process.cwd(), "tests", "fixtures", "budget_import.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  return parseCsv(raw);
}

export function buildSeedStateFromRows(rows) {
  // Mirror Settings.jsx smart import behavior:
  // - ensure Teles + Nicole accounts exist
  // - split each bill row into TWO bills (H amount + W amount) instead of one "Shared" bill
  // - support optional PaySchedule row (explicit schedule beats inference)
  const accountHId = "checking-teles-1";
  const accountWId = "checking-nicole-1";

  // 0) Optional explicit pay schedule row (matches csvScanner.js support)
  let explicitSchedule = null;

  for (const r of rows) {
    const section = (r.Section || "").toLowerCase().trim();
    if (section !== "payschedule" && section !== "pay schedule" && section !== "schedule") continue;

    const freqRaw = String(r.Name || "").toLowerCase();
    const frequency = freqRaw.includes("month") && !freqRaw.includes("semi") ? "monthly" : "semi-monthly";

    const day1Raw = parseDayOrLast(r["Due Day"]);
    const day2Raw = parseDayOrLast(r["User A (Teles)"]);

    const day1 = day1Raw ?? 15;
    const day2 = frequency === "semi-monthly" ? (day2Raw ?? "last") : "last";

    if (frequency === "monthly") {
      explicitSchedule = { type: "monthly", day1: day1 === "last" ? "last" : day1, day2: "last" };
    } else {
      explicitSchedule = {
        type: "semi-monthly",
        day1: day1 === "last" ? 15 : day1,
        day2: day2 === null ? "last" : day2,
      };
    }

    // If multiple PaySchedule rows exist, last one wins.
  }

  // 1) Income mapping
  // Map to store's income.husband / income.wife (store uses {husband,wife})
  const income = { husband: 0, wife: 0 };
  const incomeDayHints = [];

  for (const r of rows) {
    if ((r.Section || "").toLowerCase().trim() !== "income") continue;

    const amt = toNumber(r["Total Amount"]);
    const name = (r.Name || "").toLowerCase();
    const hint = parseDayOrLast(r["Due Day"]);
    if (hint != null) incomeDayHints.push(hint);

    if (name.includes("nicole")) income.wife += amt;
    else income.husband += amt; // default to husband for "Teles"
  }

  // 2) Pay schedule mapping (prefer explicit row; else infer from income "Due Day")
  let paySchedule = { type: "semi-monthly", day1: 15, day2: "last" };

  if (explicitSchedule) {
    paySchedule = explicitSchedule;
  } else if (incomeDayHints.length > 0) {
    const uniq = Array.from(
      new Set(incomeDayHints.map((x) => (typeof x === "string" ? "last" : x)))
    );
    const hasLast = uniq.includes("last");
    const nums = uniq.filter((x) => typeof x === "number").sort((a, b) => a - b);

    if (hasLast && nums.length === 0) {
      paySchedule = { type: "monthly", day1: "last", day2: "last" };
    } else if (nums.length >= 2) {
      paySchedule = { type: "semi-monthly", day1: nums[0], day2: nums[1] };
    } else if (nums.length === 1 && hasLast) {
      paySchedule = { type: "semi-monthly", day1: nums[0], day2: "last" };
    } else if (nums.length === 1) {
      // common default when only one payday is given in CSV
      paySchedule = { type: "semi-monthly", day1: nums[0], day2: "last" };
    }
  }

  // 3) Bills mapping -> recurringBills (SPLIT PER USER)
  const recurringBills = [];
  for (const r of rows) {
    const section = (r.Section || "").toLowerCase().trim();
    if (section !== "bill" && section !== "expense") continue;

    const name = r.Name || "Imported Bill";
    const total = toNumber(r["Total Amount"]);
    const dueDay = Math.max(1, Math.min(31, Math.round(toNumber(r["Due Day"]) || 1)));

    const aShare = toNumber(r["User A (Teles)"]);
    const bShare = toNumber(r["User B (Nicole)"]);

    const base = `${name}-${dueDay}`;
    const category = r.Category || "";

    // H -> Teles
    if (aShare > 0) {
      recurringBills.push({
        id: `${slugId("bill", base)}-h`,
        name,
        amount: aShare,
        amountCents: Math.round(aShare * 100),
        dueDay,
        category,
        payer: "H",
        accountId: accountHId,
      });
    }

    // W -> Nicole
    if (bShare > 0) {
      recurringBills.push({
        id: `${slugId("bill", base)}-w`,
        name,
        amount: bShare,
        amountCents: Math.round(bShare * 100),
        dueDay,
        category,
        payer: "W",
        accountId: accountWId,
      });
    }

    // Fallback: if both split columns are empty but total exists, default to H (matches Settings.jsx fallback)
    if (aShare <= 0 && bShare <= 0 && total > 0) {
      recurringBills.push({
        id: `${slugId("bill", base)}-h`,
        name,
        amount: total,
        amountCents: Math.round(total * 100),
        dueDay,
        category,
        payer: "H",
        accountId: accountHId,
      });
    }
  }

  const accounts = [
    {
      id: accountHId,
      name: "Teles Checking",
      openingBalance: 0,
      balance: 0,
      balanceCents: 0,
      currentBalance: 0,
      currentBalanceCents: 0,
      ownerRole: "H",
      ownerUid: null,
    },
    {
      id: accountWId,
      name: "Nicole Checking",
      openingBalance: 0,
      balance: 0,
      balanceCents: 0,
      currentBalance: 0,
      currentBalanceCents: 0,
      ownerRole: "W",
      ownerUid: null,
    },
  ];

  const startDate = "2025-01-01";

  return {
    // Use store's plannerSettings ingestion route
    plannerSettings: {
      startDate,
      startingBalance: 0,
      income,
      paySchedule,
      billSharing: { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] },
      residualAccountId: accountHId, // match Settings.jsx fallback (H if no residual)
      mode: "planned",
    },

    userProfile: { role: "H" },

    accounts,
    recurringBills,
    transactions: [],
    expenses: [],
    goals: [],
    categoryBudgets: {},
    extraIncomes: [],
    allocationRules: [],
    paidBills: {},
    confirmedDiscretionary: {},
    residualAccountId: accountHId,

    // Debug info for you to compare import vs UI
    __importDebug: {
      source: "tests/fixtures/budget_import.csv",
      income,
      paySchedule,
      billCount: recurringBills.length,
      billCountByPayer: {
        H: recurringBills.filter((b) => b.payer === "H").length,
        W: recurringBills.filter((b) => b.payer === "W").length,
      },
      hasExplicitPayScheduleRow: !!explicitSchedule,
    },
  };
}

export async function seedStoreFromBudgetImport(page) {
  const rows = loadBudgetImportRows();
  const seed = buildSeedStateFromRows(rows);

  await page.waitForFunction(() => !!window.__cashflowStore?.getState?.(), { timeout: 15000 });

  await page.evaluate((data) => {
    const store = window.__cashflowStore;
    const s = store?.getState?.();
    if (!s?.setFullPlanData) throw new Error("Missing setFullPlanData on store state");

    s.setFullPlanData(data);
    s.setHasHydrated?.(true);
  }, seed);

  return seed;
}
