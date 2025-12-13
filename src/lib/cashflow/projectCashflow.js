// src/lib/cashflow/projectCashflow.js

import { toCents } from "./formatters";
import { getDateForMonthIndex, getMonthIndexFromStart, clampDayToMonth, getTodayISODate } from "./dateUtils";

// --- Internal Helper: Generate Paydays ---

function enumerateSemiMonthlyPaydays(startDateStr, months, paySchedule) {
  const start = new Date(`${startDateStr || "2025-01-01"}T00:00:00`);
  const out = [];
  const type = paySchedule?.type || "semi-monthly";
  const rawDay1 = paySchedule?.day1;
  const rawDay2 = paySchedule?.day2;

  for (let i = 0; i < Math.max(1, months || 1); i++) {
    const monthDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = monthDate.getFullYear();
    const monthIndex0 = monthDate.getMonth();
    const monthEndDay = new Date(year, monthIndex0 + 1, 0).getDate();
    const dates = [];

    if (type === "semi-monthly") {
      const day1 = clampDayToMonth(
        year,
        monthIndex0,
        Number.isFinite(+rawDay1) ? +rawDay1 : 15
      );
      dates.push(new Date(year, monthIndex0, day1));

      if (rawDay2 === "last" || rawDay2 === undefined || rawDay2 === null) {
        dates.push(new Date(year, monthIndex0, monthEndDay));
      } else {
        const d2 = clampDayToMonth(
          year,
          monthIndex0,
          Number.isFinite(+rawDay2) ? +rawDay2 : monthEndDay
        );
        if (d2 !== day1) {
          dates.push(new Date(year, monthIndex0, d2));
        }
      }
    } else {
      // Default fallback
      dates.push(new Date(year, monthIndex0, clampDayToMonth(year, monthIndex0, 15)));
    }

    dates
      .sort((a, b) => a.getTime() - b.getTime())
      .forEach((d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        out.push({ date: `${yyyy}-${mm}-${dd}`, monthIndex: i });
      });
  }
  return out;
}

// --- Internal Helper: Allocate Income ---

function allocateIncome({ amountCents, accounts, allocationRules, residualAccountId, payIndex }) {
  const deltasByAccount = {};
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  safeAccounts.forEach((a) => {
    if (a?.id) deltasByAccount[a.id] = 0;
  });

  if (!Number.isFinite(amountCents) || amountCents <= 0 || !safeAccounts.length) {
    return { deltasByAccount, appliedCents: 0 };
  }

  let remaining = amountCents;
  const rules = Array.isArray(allocationRules) ? allocationRules : [];

  // Filter rules by frequency
  const applicable = rules.filter((r) => {
    const freq = r.frequency || r.freq || "each";
    if (freq === "each") return true;
    if (freq === "first") return payIndex === 1;
    if (freq === "second") return payIndex === 2;
    return true;
  });

  // Partition amount and percent rules
  const amountRules = [];
  const percentRules = [];

  for (const r of applicable) {
    const type = r.type || (r.amount != null ? "amount" : "percent");
    if (type === "amount") {
      amountRules.push(r);
    } else {
      percentRules.push(r);
    }
  }

  // Apply fixed amount rules first
  for (const r of amountRules) {
    const accId = r?.accountId;
    if (!accId || !(accId in deltasByAccount)) continue;
    const val = r.amount != null ? r.amount : r.value;
    const ruleCents = toCents(val);
    if (!ruleCents || ruleCents <= 0) continue;
    const applied = Math.min(ruleCents, remaining);
    if (applied <= 0) continue;
    deltasByAccount[accId] += applied;
    remaining -= applied;
    if (remaining <= 0) break;
  }

  // Apply percent rules on the remaining amount
  for (const r of percentRules) {
    const accId = r?.accountId;
    if (!accId || !(accId in deltasByAccount)) continue;
    const pct = r.value != null ? r.value : r.percentage;
    const percent = Number(pct);
    if (!Number.isFinite(percent) || percent <= 0) continue;
    const fraction = percent / 100;
    const alloc = Math.floor(remaining * fraction);
    if (alloc <= 0) continue;
    deltasByAccount[accId] += alloc;
    remaining -= alloc;
  }

  // Deposit leftover to residual account
  if (remaining > 0) {
    const fallbackAccId =
      residualAccountId && deltasByAccount.hasOwnProperty(residualAccountId)
        ? residualAccountId
        : safeAccounts[0].id;
    if (fallbackAccId) deltasByAccount[fallbackAccId] += remaining;
  }

  const appliedCents = Object.values(deltasByAccount).reduce(
    (sum, v) => sum + (Number.isFinite(v) ? v : 0),
    0
  );

  return { deltasByAccount, appliedCents };
}

// --- Main Engine Function ---

const stableStringify = (value) => {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
};

const buildCacheKey = (params = {}) => {
  const normalized = {
    startDate: params.startDate || "2025-01-01",
    months: Math.max(1, params.months || 1),
    accounts: Array.isArray(params.accounts) ? params.accounts : [],
    bills: Array.isArray(params.bills) ? params.bills : [],
    income: params.income || {},
    extraIncomes: Array.isArray(params.extraIncomes) ? params.extraIncomes : [],
    expenses: Array.isArray(params.expenses) ? params.expenses : [],
    paySchedule: params.paySchedule || {},
    allocationRules: Array.isArray(params.allocationRules) ? params.allocationRules : [],
    residualAccountId: params.residualAccountId || null,
    paidBills: params.paidBills || {},
    mode: params.mode || "projected",
  };
  return stableStringify(normalized);
};

const computeProjectCashflow = ({
  startDate,
  months,
  accounts,
  bills,
  income,
  extraIncomes,
  expenses,
  paySchedule,
  allocationRules,
  residualAccountId,
  paidBills = {},
  mode = "projected",
}) => {
  const startDateStr = startDate || "2025-01-01";
  const projectionMonths = Math.max(1, months || 1);
  const safeAccounts = Array.isArray(accounts) && accounts.length ? accounts.map((a) => ({ ...a })) : [];
  
  // Initialize balances
  const balances = {};
  safeAccounts.forEach((a) => {
    if (a?.id) balances[a.id] = toCents(a.openingBalance || 0);
  });
  if (Object.keys(balances).length === 0) {
    balances["default"] = 0;
    if (!safeAccounts.length) {
      safeAccounts.push({ id: "default", type: "checking", openingBalance: 0 });
    }
  }
  
  const residualId = residualAccountId && balances.hasOwnProperty(residualAccountId) ? residualAccountId : safeAccounts[0].id;

  // 1) Build income events
  const paydays = enumerateSemiMonthlyPaydays(startDateStr, projectionMonths, paySchedule);
  const safeH = Number.isFinite(+income?.husband) ? Math.max(0, +income.husband) : 0;
  const safeW = Number.isFinite(+income?.wife) ? Math.max(0, +income.wife) : 0;
  const perPayTotal = toCents(safeH) + toCents(safeW);
  
  const payCountsByMonth = {};
  const salaryEvents = paydays.map((p, idx) => {
    const count = (payCountsByMonth[p.monthIndex] = (payCountsByMonth[p.monthIndex] || 0) + 1);
    return {
      date: p.date,
      kind: "income",
      monthIndex: p.monthIndex,
      _sequence: idx,
      amountCents: perPayTotal,
      description: "Salary Paycheque",
      payIndex: count,
    };
  });

  const safeExtraIncomes = Array.isArray(extraIncomes) ? extraIncomes : [];
  const extraEvents = [];
  // For extra incomes, we treat them as occurring on the 1st of the month if no date provided
  for (let m = 0; m < projectionMonths; m++) {
    const dateStr = getDateForMonthIndex(startDateStr, m, 1);
    safeExtraIncomes.forEach((ex, idx) => {
      const amt = toCents(ex.amount || 0);
      if (amt > 0) {
        extraEvents.push({
          date: dateStr,
          kind: "income",
          monthIndex: m,
          _sequence: m * 1000 + idx,
          amountCents: amt,
          description: ex.description || "Extra Income",
          isExtra: true,
          payIndex: 1,
        });
      }
    });
  }
  const incomeEvents = [...salaryEvents, ...extraEvents];

  // 2) Build bill events
  const safeBills = Array.isArray(bills) ? bills : [];
  const safePaidBills = paidBills || {};
  const billEvents = [];
  const todayLocal = getTodayISODate();
  const todayUtc = new Date().toISOString().slice(0, 10);
  const todayCutoff = todayUtc > todayLocal ? todayUtc : todayLocal;
  for (let m = 0; m < projectionMonths; m++) {
    for (const b of safeBills) {
      if (!b?.id) continue;
      // Skip non-active bills
      if (b.status && b.status !== "active") continue;

      const dueDay = Number.isFinite(+b.dueDay) ? +b.dueDay : 1;
      const billDate = getDateForMonthIndex(startDateStr, m, dueDay);
      const key = `${billDate}:${b.id}`;
      const isPaid = !!safePaidBills[key];

      // In actual mode, skip unpaid bills in the past? 
      // The requirement is usually: "Actual" means "what actually happened + future projection"
      // But typically "Actual" mode hides UNPAID bills in the past if the user wants to see "real cash now".
      // However, for projection, we usually want to know what's pending.
      // Logic from previous engine:
      if (mode === "actual" && billDate < todayCutoff && !isPaid) {
        continue;
      }

      billEvents.push({
        date: billDate,
        kind: "bill",
        monthIndex: m,
        _sequence: m * 1000 + billEvents.length,
        amountCents: toCents(b.amount || 0),
        accountId: b.accountId || residualId,
        billId: b.id,
        billName: b.name,
        isPaid,
      });
    }
  }

  // 3) Build Expense events
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const expenseEvents = safeExpenses.map((ex, idx) => {
    const date = ex.date || startDateStr;
    const mIndex = getMonthIndexFromStart(startDateStr, date);
    return {
      date,
      kind: "expense",
      monthIndex: mIndex,
      _sequence: 5000 + idx,
      amountCents: toCents(ex.amount || 0),
      accountId: ex.accountId || residualId,
      description: ex.description || "Expense",
    };
  });

  // 4) Actual-mode filtering
  let filteredIncome = incomeEvents;
  let filteredExpenses = expenseEvents;
  if (mode === "actual") {
    filteredIncome = incomeEvents.filter((ev) => ev.date <= todayCutoff);
    filteredExpenses = expenseEvents.filter((ev) => ev.date <= todayCutoff);
  }

  // 5) Merge and Sort
  const allEvents = [
    ...filteredIncome,
    ...billEvents,
    ...filteredExpenses,
  ].sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    // Income first, then bills/expenses
    if (a.kind === "income" && b.kind !== "income") return -1;
    if (a.kind !== "income" && b.kind === "income") return 1;
    return (a._sequence || 0) - (b._sequence || 0);
  });

  // 6) Run Ledger
  const ledger = [];
  const monthlyTotals = [];
  
  // Init monthly summary buckets
  for (let i = 0; i < projectionMonths; i++) {
    const dateForLabel = getDateForMonthIndex(startDateStr, i, 1);
    const d = new Date(`${dateForLabel}T00:00:00`);
    monthlyTotals.push({
      monthIndex: i,
      monthLabel: d.toLocaleString("default", { month: "long", year: "numeric" }),
      totalIncome: 0,
      totalBills: 0,
      net: 0,
    });
  }

  // Opening entry
  ledger.push({
    date: startDateStr,
    kind: "opening",
    delta: 0,
    balances: { ...balances },
    monthIndex: 0,
    description: "Opening Balance",
  });

  for (const ev of allEvents) {
    const monthIndex = typeof ev.monthIndex === "number" ? ev.monthIndex : getMonthIndexFromStart(startDateStr, ev.date);
    
    // Skip events outside projection range
    if (monthIndex < 0 || monthIndex >= projectionMonths) continue;

    if (ev.kind === "income") {
      if (ev.amountCents > 0) {
        const { deltasByAccount, appliedCents } = allocateIncome({
          amountCents: ev.amountCents,
          accounts: safeAccounts,
          allocationRules,
          residualAccountId: residualId,
          payIndex: ev.payIndex || 1,
        });
        Object.entries(deltasByAccount).forEach(([accId, delta]) => {
          if (!balances.hasOwnProperty(accId)) balances[accId] = 0;
          balances[accId] += delta;
        });
        monthlyTotals[monthIndex].totalIncome += appliedCents;
        monthlyTotals[monthIndex].net += appliedCents;
        ledger.push({
          date: ev.date,
          kind: "income",
          delta: appliedCents,
          balances: { ...balances },
          monthIndex,
          description: ev.description,
        });
      }
    } else if (ev.kind === "bill" || ev.kind === "expense") {
      const amt = ev.amountCents || 0;
      let delta = 0;
      // Deduct if it's an expense OR an unpaid bill
      if (ev.kind === "expense" || !ev.isPaid) {
        delta = amt;
        const accId = ev.accountId || residualId;
        if (accId) {
            if (!balances.hasOwnProperty(accId)) balances[accId] = 0;
            balances[accId] -= delta;
        }
        monthlyTotals[monthIndex].totalBills += delta;
        monthlyTotals[monthIndex].net -= delta;
      }
      ledger.push({
        date: ev.date,
        kind: ev.kind,
        delta: -delta,
        id: ev.billId || ev.id || null,
        balances: { ...balances },
        monthIndex,
        description: ev.kind === "bill" ? ev.billName : ev.description,
        isPaid: ev.isPaid
      });
    }
  }

  return { ledger, monthlySummary: monthlyTotals, finalBalancesByAccount: balances };
};

let lastCacheKey = null;
let lastResult = null;

export function projectCashflow(params) {
  const cacheKey = buildCacheKey(params);
  if (cacheKey && cacheKey === lastCacheKey && lastResult) {
    return lastResult;
  }
  const result = computeProjectCashflow(params);
  lastCacheKey = cacheKey;
  lastResult = result;
  return result;
}

