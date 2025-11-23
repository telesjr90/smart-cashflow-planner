// Updated in Step 1 – Actual mode cashflow logic
//
// NOTE: This file is copied from the upstream smart-cashflow-planner repository.
// It provides a series of helpers and a projection engine used by the
// MonthlyCashFlowInfographic component.  For this phase of the project we
// have not made any behavioural changes to the engine itself; however,
// including it here ensures the local build contains all necessary
// dependencies without fetching from the network at runtime.

export function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

function clampDay(year, monthIndex0, day) {
  const last = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

export function getDateForMonthIndex(startDateStr, monthIndex, day) {
  const [y, m] = (startDateStr || "2025-01-01")
    .split("-")
    .map((x) => parseInt(x, 10));
  const base = new Date(y, m - 1, 1);
  const target = new Date(base.getFullYear(), base.getMonth() + monthIndex, 1);

  const safeDay = clampDay(target.getFullYear(), target.getMonth(), day);
  const d = new Date(target.getFullYear(), target.getMonth(), safeDay);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dd}`;
}

export function getMonthIndexFromStart(startDateStr, targetDateStr) {
  const [sy, sm] = (startDateStr || "2025-01-01")
    .split("-")
    .map((x) => parseInt(x, 10));
  const [ty, tm] = (targetDateStr || "2025-01-01")
    .split("-")
    .map((x) => parseInt(x, 10));

  return (ty - sy) * 12 + (tm - sm);
}

export function enumerateSemiMonthlyPaydays(startDateStr, months, paySchedule) {
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
      const day1 = clampDay(
        year,
        monthIndex0,
        Number.isFinite(+rawDay1) ? +rawDay1 : 15
      );
      dates.push(new Date(year, monthIndex0, day1));

      if (rawDay2 === "last" || rawDay2 === undefined || rawDay2 === null) {
        dates.push(new Date(year, monthIndex0, monthEndDay));
      } else {
        const d2 = clampDay(
          year,
          monthIndex0,
          Number.isFinite(+rawDay2) ? +rawDay2 : monthEndDay
        );
        if (d2 !== day1) {
          dates.push(new Date(year, monthIndex0, d2));
        }
      }
    } else {
      dates.push(new Date(year, monthIndex0, clampDay(year, monthIndex0, 15)));
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

/**
 * Allocate income for a single pay event. Supports both amount and percent
 * rules with frequency (each, first, second). Amount rules are applied first
 * before percentage rules. Any leftover goes into the residual account.
 * @param {Object} params
 * @param {number} params.amountCents - total pay amount in cents
 * @param {Array} params.accounts - list of user accounts
 * @param {Array} params.allocationRules - allocation rules
 * @param {string|null} params.residualAccountId - fallback account ID
 * @param {number} params.payIndex - 1 for first pay of month, 2 for second
 */
export function allocateIncome({
  amountCents,
  accounts,
  allocationRules,
  residualAccountId,
  payIndex,
}) {
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
    // fallback: unknown frequency treat as each
    return true;
  });

  // Partition amount and percent rules (legacy support: if r.amount defined, treat as amount)
  const amountRules = [];
  const percentRules = [];
  for (const r of applicable) {
    // Determine type
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
    // Determine value: support legacy r.amount and new r.value
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

export function applyOutflow(balancesByAccount, accountId, amountCents) {
  const amt = Number(amountCents);
  if (!Number.isFinite(amt) || amt <= 0) return;
  if (!accountId) return;
  if (!balancesByAccount.hasOwnProperty(accountId)) balancesByAccount[accountId] = 0;
  balancesByAccount[accountId] -= amt;
}

/**
 * Core projection engine.
 *
 * Accepts arrays of bills and expenses along with pay schedule and income to
 * simulate a cash ledger across multiple months.  It returns a ledger of
 * events and a monthly summary of total income, bills and net flow.  This
 * implementation matches the upstream repository and is not modified for
 * shared goals or budgets.  The filtering and contribution logic for goals
 * and budgets lives in the React layer (MonthlyCashFlowInfographic).  This
 * ensures the engine remains a pure cash ledger simulation without
 * user-specific abstractions.
 */
export function projectCashflow({
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
}) {
  const startDateStr = startDate || "2025-01-01";
  const projectionMonths = Math.max(1, months || 1);
  const safeAccounts = Array.isArray(accounts) && accounts.length
    ? accounts.map((a) => ({ ...a }))
    : [];
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
  const residualId =
    residualAccountId && balances.hasOwnProperty(residualAccountId)
      ? residualAccountId
      : safeAccounts[0].id;

  // ---------- 2) Build income events ----------
  const paydays = enumerateSemiMonthlyPaydays(
    startDateStr,
    projectionMonths,
    paySchedule
  );
  const perPayH = toCents(income?.husband || 0);
  const perPayW = toCents(income?.wife || 0);
  const perPayTotal = perPayH + perPayW;
  // Determine pay index (first or second) for each payday
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

  // ---------- 3) Build bill events ----------
  const safeBills = Array.isArray(bills) ? bills : [];
  const safePaidBills = paidBills || {};
  const billEvents = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  for (let m = 0; m < projectionMonths; m++) {
    for (const b of safeBills) {
      if (!b?.id) continue;
      
      // SAFETY CHECK: Treat undefined status as 'active' for legacy compatibility.
      // Skip bills that are explicitly not active (e.g. pending/archived).
      const status = b.status || "active";
      if (status !== "active") continue;

      const dueDay = Number.isFinite(+b.dueDay) ? +b.dueDay : 1;
      const billDate = getDateForMonthIndex(startDateStr, m, dueDay);
      const key = `${billDate}:${b.id}`;
      const isPaid = !!safePaidBills[key];
      if (mode === "actual" && billDate < todayStr && !isPaid) {
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
  // ---------- 3b) Build Expense events (PHASE 4) ----------
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

  // ---------- 3c) Actual-mode filtering for income & expenses ----------
  // In "actual" mode we only keep:
  // - income events whose date is <= today
  // - extra income events whose date is <= today
  // - expense events whose date is <= today
  // Bills already have their own actual-mode behavior:
  //   - past unpaid bills are skipped
  //   - future bills are kept
  let filteredIncomeEvents = incomeEvents;
  let filteredExtraEvents = extraEvents;
  let filteredExpenseEvents = expenseEvents;

  if (mode === "actual") {
    filteredIncomeEvents = incomeEvents.filter((ev) => ev.date <= todayStr);
    filteredExtraEvents = extraEvents.filter((ev) => ev.date <= todayStr);
    filteredExpenseEvents = expenseEvents.filter((ev) => ev.date <= todayStr);
  }

  // ---------- 4) Merge events & sort ----------
  const allEvents = [...filteredIncomeEvents, ...billEvents, ...filteredExpenseEvents].sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    // Income first
    if (a.kind === "income" && b.kind !== "income") return -1;
    if (a.kind !== "income" && b.kind === "income") return 1;
    return (a._sequence || 0) - (b._sequence || 0);
  });

  // ---------- 5) Simulate ledger ----------
  const ledger = [];
  const monthlyTotals = [];
  for (let i = 0; i < projectionMonths; i++) {
    const dateForLabel = getDateForMonthIndex(startDateStr, i, 1);
    const d = new Date(`${dateForLabel}T00:00:00`);
    const monthLabel = d.toLocaleString("default", { month: "long", year: "numeric" });
    monthlyTotals.push({ monthIndex: i, monthLabel, totalIncome: 0, totalBills: 0, net: 0 });
  }
  for (const ev of allEvents) {
    const monthIndex = typeof ev.monthIndex === "number" ? ev.monthIndex : getMonthIndexFromStart(startDateStr, ev.date);
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
        ledger.push({ date: ev.date, kind: "income", delta: appliedCents, balances: { ...balances }, monthIndex, description: ev.description });
      }
    } else if (ev.kind === "bill" || ev.kind === "expense") {
      const amt = ev.amountCents || 0;
      let delta = 0;
      // Deduct if it's an expense OR an unpaid bill
      if (ev.kind === "expense" || !ev.isPaid) {
        delta = amt;
        applyOutflow(balances, ev.accountId || residualId, delta);
        monthlyTotals[monthIndex].totalBills += delta;
        monthlyTotals[monthIndex].net -= delta;
      }
      ledger.push({ date: ev.date, kind: ev.kind, delta: -delta, balances: { ...balances }, monthIndex, description: ev.kind === "bill" ? ev.billName : ev.description });
    }
  }
  return { ledger, monthlySummary: monthlyTotals };
}
