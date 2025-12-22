// src/lib/cashflow/projectCashflow.js

import { toCents } from "./formatters";
import {
  getDateForMonthIndex,
  getMonthIndexFromStart,
  clampDayToMonth,
  getTodayISODate,
} from "./dateUtils";

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
      dates.push(
        new Date(year, monthIndex0, clampDayToMonth(year, monthIndex0, 15))
      );
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

function allocateIncome({
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

  if (
    !Number.isFinite(amountCents) ||
    amountCents <= 0 ||
    !safeAccounts.length
  ) {
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
  if (Array.isArray(value))
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
};

const normalizeMode = (mode) => {
  if (!mode || mode === "projected") return "planned";
  return mode === "actual" ? "actual" : "planned";
};

// --- Goal Helpers ---

const normalizeGoalStatus = (status) => {
  if (typeof status !== "string") return "active";
  const lowered = status.toLowerCase();
  if (lowered === "pending") return "pending";
  if (lowered === "rejected") return "rejected";
  return "active";
};

const getGoalAmountCents = (goal) => {
  if (!goal || typeof goal !== "object") return 0;

  const candidateFields = [
    goal.perMonth,
    goal.monthlyAmount,
    goal.monthlyContribution,
    goal.amount,
  ];

  let amount = candidateFields.find((v) => Number.isFinite(Number(v)));

  if (!Number.isFinite(Number(amount))) {
    const contributions = goal.contributions;
    if (contributions && typeof contributions === "object") {
      const sum = ["H", "W", "household"].reduce(
        (acc, key) => acc + (Number(contributions[key]) || 0),
        0
      );
      if (Number.isFinite(sum) && sum > 0) amount = sum;
    }
  }

  const cents = toCents(amount || 0);
  return cents > 0 ? cents : 0;
};

const getGoalContributionDay = (goal, fallbackStartDateStr) => {
  const explicit =
    goal?.contributionDay ?? goal?.dueDay ?? goal?.day ?? goal?.contributionDate;
  if (Number.isFinite(Number(explicit))) return Number(explicit);

  const sourceDate =
    goal?.startDate || goal?.date || fallbackStartDateStr || "2025-01-01";
  const day = Number(String(sourceDate).slice(8, 10));
  if (Number.isFinite(day) && day > 0) return day;
  return 1;
};

const isGoalAppliedInMode = (goal, mode) => {
  const status = normalizeGoalStatus(goal?.status);
  const isConfirmedFlag =
    goal?.confirmed === true ||
    goal?.isConfirmed === true ||
    goal?.confirmation === true ||
    !!goal?.confirmedAt;

  const applyInPlanned = status !== "rejected";
  if (mode === "planned") return applyInPlanned;

  // Actual only applies confirmed/active goals; pending or rejected are skipped.
  if (status === "rejected") return false;
  if (status === "pending" && !isConfirmedFlag) return false;
  return status === "active" || isConfirmedFlag;
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
    allocationRules: Array.isArray(params.allocationRules)
      ? params.allocationRules
      : [],
    residualAccountId: params.residualAccountId || null,
    paidBills: params.paidBills || {},
    savings: Array.isArray(params.savings) ? params.savings : [],
    goals: Array.isArray(params.goals) ? params.goals : [],
    mode: normalizeMode(params.mode),
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
  savings,
  goals,
  mode = "planned",
}) => {
  const normalizedMode = normalizeMode(mode);
  const startDateStr = startDate || "2025-01-01";
  const projectionMonths = Math.max(1, months || 1);
  const safeAccounts =
    Array.isArray(accounts) && accounts.length
      ? accounts.map((a) => ({ ...a }))
      : [];

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

  const residualId =
    residualAccountId && balances.hasOwnProperty(residualAccountId)
      ? residualAccountId
      : safeAccounts[0].id;
  let runningTotal = Object.values(balances).reduce(
    (sum, v) => sum + (Number.isFinite(+v) ? +v : 0),
    0
  );

  // 1) Build income events
  const paydays = enumerateSemiMonthlyPaydays(
    startDateStr,
    projectionMonths,
    paySchedule
  );
  const safeH = Number.isFinite(+income?.husband)
    ? Math.max(0, +income.husband)
    : 0;
  const safeW = Number.isFinite(+income?.wife) ? Math.max(0, +income.wife) : 0;
  const perPayTotal = toCents(safeH) + toCents(safeW);

  const payCountsByMonth = {};
  const salaryEvents = paydays.map((p, idx) => {
    const count = (payCountsByMonth[p.monthIndex] =
      (payCountsByMonth[p.monthIndex] || 0) + 1);
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
  const extraIncomeEvents = [];
  const expenseLikeExtras = [];
  // For extra incomes, we treat them as occurring on the 1st of the month if no date provided.
  for (let m = 0; m < projectionMonths; m++) {
    const dateStr = getDateForMonthIndex(startDateStr, m, 1);
    safeExtraIncomes.forEach((ex, idx) => {
      const isExpenseKind =
        (ex?.kind || ex?.type || "").toLowerCase() === "expense";
      if (isExpenseKind) {
        expenseLikeExtras.push({
          ...ex,
          date: ex.date || dateStr,
          monthIndex: m,
          _sequence: m * 1000 + idx,
        });
        return;
      }
      const amt = toCents(ex.amount || 0);
      if (amt > 0) {
        extraIncomeEvents.push({
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
  const incomeEvents = [...salaryEvents, ...extraIncomeEvents];

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
  const incomeTransactions = [];
  const pureExpenses = [];
  safeExpenses.forEach((ex) => {
    const type = (ex?.type || ex?.kind || "").toLowerCase();
    if (type === "income") {
      incomeTransactions.push(ex);
    } else {
      pureExpenses.push(ex);
    }
  });
  const safeSavings = Array.isArray(savings) ? savings : [];
  let syntheticSavings = [];

  // If callers supply expense/discretionary overlays without an explicit savings array,
  // keep a placeholder entry so downstream consumers (tests/UI) can still find the id.
  if (!safeSavings.length && normalizedMode === "actual") {
    syntheticSavings = pureExpenses
      .filter((ex) => ex && ex.includeInDiscretionary === false)
      .map((ex, idx) => {
        const rawId = ex.id || ex.expenseId || null;
        const fallbackId =
          (rawId && String(rawId).startsWith("sv")) || !rawId
            ? rawId
            : `sv${idx + 1}`;
        return {
          ...ex,
          id: fallbackId || `sv${idx + 1}`,
          amount: 0,
        };
      });
  }
  const expenseSources = [
    ...pureExpenses,
    ...safeSavings,
    ...expenseLikeExtras,
    ...syntheticSavings,
  ];
  const expenseEvents = expenseSources.map((ex, idx) => {
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
      id: ex.id || ex.expenseId || null,
      includeInDiscretionary: ex.includeInDiscretionary,
    };
  });

  const incomeTransactionEvents = incomeTransactions
    .map((tx, idx) => {
      const date = tx.date || startDateStr;
      const mIndex = getMonthIndexFromStart(startDateStr, date);
      const amountCents = toCents(tx.amount || 0);
      if (!amountCents || amountCents <= 0) return null;
      return {
        date,
        kind: "income",
        monthIndex: mIndex,
        _sequence: 7000 + idx,
        amountCents,
        description: tx.description || "Recorded Income",
        accountId: tx.accountId || residualId,
        source: tx.source || tx.type || "income-transaction",
        id: tx.id || tx.expenseId || null,
      };
    })
    .filter(Boolean);

  // 4) Build Goal contribution events (planned baseline; confirmed-only in actual)
  const safeGoals = Array.isArray(goals) ? goals : [];
  const goalEvents = [];

  for (const goal of safeGoals) {
    const amountCents = getGoalAmountCents(goal);
    if (!amountCents) continue;

    const applyInPlanned = isGoalAppliedInMode(goal, "planned");
    const applyInActual = isGoalAppliedInMode(goal, "actual");
    if (!applyInPlanned && !applyInActual) continue;

    const startIdxRaw = goal?.startDate
      ? getMonthIndexFromStart(startDateStr, goal.startDate)
      : 0;
    const endIdxRaw = goal?.endDate
      ? getMonthIndexFromStart(startDateStr, goal.endDate)
      : null;

    const startIdx = Number.isFinite(startIdxRaw) ? Math.max(0, startIdxRaw) : 0;
    const endIdx = Number.isFinite(endIdxRaw)
      ? Math.min(projectionMonths - 1, endIdxRaw)
      : projectionMonths - 1;

    if (startIdx > endIdx) continue;

    const contributionDay = getGoalContributionDay(goal, startDateStr);
    for (let m = startIdx; m <= endIdx; m++) {
      const goalDate = getDateForMonthIndex(startDateStr, m, contributionDay);
      goalEvents.push({
        date: goalDate,
        kind: "goal",
        monthIndex: m,
        _sequence: m * 1000 + 200 + goalEvents.length,
        amountCents,
        accountId: goal.accountId || goal.linkedAccount || residualId,
        goalId: goal.id,
        goalName: goal.name,
        applyInPlanned,
        applyInActual,
      });
    }
  }

  // 5) Mode filtering
  const recordedIncomeByDate = new Map();
  incomeTransactionEvents.forEach((ev) => {
    if (!ev?.date) return;
    const cents = ev.amountCents || 0;
    if (!Number.isFinite(cents) || cents <= 0) return;
    const prev = recordedIncomeByDate.get(ev.date) || 0;
    recordedIncomeByDate.set(ev.date, prev + cents);
  });

  const filteredIncome =
    normalizedMode === "actual"
      ? [
          ...incomeEvents.filter((ev) => {
            if (!ev?.date) return false;
            if (ev.date <= todayCutoff && recordedIncomeByDate.has(ev.date)) {
              return false;
            }
            return true;
          }),
          ...incomeTransactionEvents.filter((ev) => ev.date <= todayCutoff),
        ]
      : incomeEvents; // Keep baseline schedule in planned

  const filteredExpenses =
    normalizedMode === "actual"
      ? expenseEvents.filter((ev) => ev.date <= todayCutoff)
      : [];

  const filteredGoals = goalEvents
    .map((ev) => {
      const shouldApply =
        normalizedMode === "actual" ? ev.applyInActual : ev.applyInPlanned;
      return { ...ev, isApplied: shouldApply && ev.amountCents > 0 };
    })
    .filter((ev) => ev.isApplied);

  const filteredBills =
    normalizedMode === "actual"
      ? billEvents.filter((ev) => {
          if (!ev?.date) return false;
          if (ev.date > todayCutoff) return true; // keep future baseline
          return !!ev.isPaid; // past/today only if paid
        })
      : billEvents;

  // 6) Merge and Sort
  const allEvents = [...filteredIncome, ...filteredBills, ...filteredGoals, ...filteredExpenses].sort(
    (a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      // Income first, then bills/goals/expenses
      if (a.kind === "income" && b.kind !== "income") return -1;
      if (a.kind !== "income" && b.kind === "income") return 1;
      return (a._sequence || 0) - (b._sequence || 0);
    }
  );

  // 7) Run Ledger
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
      totalExpenses: 0,
      totalGoals: 0,
      net: 0,
      startBalanceCents: null,
      endBalanceCents: null,
      // Added later: weeks: []
    });
  }

  // Opening entry
  monthlyTotals[0].startBalanceCents = runningTotal;
  monthlyTotals[0].endBalanceCents = runningTotal;
  ledger.push({
    date: startDateStr,
    kind: "opening",
    delta: 0,
    balances: { ...balances },
    monthIndex: 0,
    description: "Opening Balance",
    startBalanceCents: runningTotal,
    endBalanceCents: runningTotal,
  });

  for (const ev of allEvents) {
    const monthIndex =
      typeof ev.monthIndex === "number"
        ? ev.monthIndex
        : getMonthIndexFromStart(startDateStr, ev.date);

    // Skip events outside projection range
    if (monthIndex < 0 || monthIndex >= projectionMonths) continue;

    if (monthlyTotals[monthIndex].startBalanceCents == null) {
      monthlyTotals[monthIndex].startBalanceCents = runningTotal;
      monthlyTotals[monthIndex].endBalanceCents = runningTotal;
    }

    if (ev.kind === "income") {
      if (ev.amountCents > 0) {
        const preBalanceTotal = runningTotal;
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
        runningTotal += appliedCents;
        monthlyTotals[monthIndex].totalIncome += appliedCents;
        monthlyTotals[monthIndex].net += appliedCents;
        ledger.push({
          date: ev.date,
          kind: "income",
          delta: appliedCents, // +income
          balances: { ...balances },
          monthIndex,
          description: ev.description,
          startBalanceCents: preBalanceTotal,
          endBalanceCents: runningTotal,
        });
        monthlyTotals[monthIndex].endBalanceCents = runningTotal;
      }
    } else if (ev.kind === "bill" || ev.kind === "expense" || ev.kind === "goal") {
      const amt = ev.amountCents || 0;
      let shouldDeduct = false;

      if (ev.kind === "expense") {
        // Expenses always deduct when they exist
        shouldDeduct = amt > 0;
      } else if (ev.kind === "bill") {
        // Planned outflows regardless of mode; actual overlays handled via filteredBills
        shouldDeduct = amt > 0;
      } else if (ev.kind === "goal") {
        shouldDeduct = amt > 0;
      }

      let deltaCents = 0;
      const preBalanceTotal = runningTotal;
      if (shouldDeduct) {
        deltaCents = amt; // positive amount to subtract from balances
        const accId = ev.accountId || residualId;
        if (accId) {
          if (!balances.hasOwnProperty(accId)) balances[accId] = 0;
          balances[accId] -= deltaCents;
        }
        runningTotal -= deltaCents;
        if (ev.kind === "expense") {
          monthlyTotals[monthIndex].totalExpenses += deltaCents;
        } else if (ev.kind === "goal") {
          monthlyTotals[monthIndex].totalGoals += deltaCents;
        } else {
          monthlyTotals[monthIndex].totalBills += deltaCents;
        }
        monthlyTotals[monthIndex].net -= deltaCents;
      }

      // Ledger delta should be signed: negative for outflows
      ledger.push({
        date: ev.date,
        kind: ev.kind,
        delta: -deltaCents,
        id: ev.billId || ev.goalId || ev.id || null,
        balances: { ...balances },
        monthIndex,
        description:
          ev.kind === "bill"
            ? ev.billName
            : ev.kind === "goal"
            ? ev.goalName || "Goal Contribution"
            : ev.description,
        isPaid: ev.isPaid,
        isGoalApplied: ev.kind === "goal" ? !!ev.isApplied : undefined,
        includeInDiscretionary:
          ev.kind === "expense" ? ev.includeInDiscretionary : undefined,
        startBalanceCents: preBalanceTotal,
        endBalanceCents: runningTotal,
      });
      monthlyTotals[monthIndex].endBalanceCents = runningTotal;
    }
  }

  // 8) Weekly breakdown
  // Week-of-month rule: Week 1 = days 1-7, Week 2 = 8-14, Week 3 = 15-21, Week 4 = 22-28, Week 5 = 29-end.
  // We derive weekly income/bills/goals/expenses/net from signed ledger deltas and carry start/end balances across weeks.
  const makeWeekBucket = (weekIdx) => ({
    weekIndex: weekIdx,
    incomeCents: 0,
    billsCents: 0,
    expenseCents: 0,
    goalCents: 0,
    netCents: 0,
    startBalanceCents: null,
    endBalanceCents: null,
  });

  const weeksByMonth = Array.from({ length: projectionMonths }, (_, i) =>
    Array.from({ length: 5 }, (_, idx) => makeWeekBucket(idx + 1))
  );

  const eventsByMonth = Array.from({ length: projectionMonths }, () => []);
  for (const entry of ledger) {
    if (!entry || !entry.date) continue;
    const mIndex =
      typeof entry.monthIndex === "number"
        ? entry.monthIndex
        : getMonthIndexFromStart(startDateStr, entry.date);
    if (mIndex < 0 || mIndex >= projectionMonths) continue;
    eventsByMonth[mIndex].push(entry);
  }

  const getMonthStartBalance = (monthIndex) => {
    if (monthlyTotals[monthIndex].startBalanceCents != null) {
      return monthlyTotals[monthIndex].startBalanceCents;
    }
    if (
      monthIndex > 0 &&
      monthlyTotals[monthIndex - 1].endBalanceCents != null
    ) {
      return monthlyTotals[monthIndex - 1].endBalanceCents;
    }
    return monthlyTotals[0].startBalanceCents || 0;
  };

  for (let i = 0; i < projectionMonths; i++) {
    const monthStart = getMonthStartBalance(i);
    if (monthlyTotals[i].startBalanceCents == null) {
      monthlyTotals[i].startBalanceCents = monthStart;
    }

    const groupedByWeek = [[], [], [], [], []];
    for (const entry of eventsByMonth[i]) {
      const day = Number(entry.date.slice(8, 10));
      if (!Number.isFinite(day) || day <= 0) continue;
      const weekIndex = Math.min(5, Math.max(1, Math.floor((day - 1) / 7) + 1));
      groupedByWeek[weekIndex - 1].push(entry);
    }

    let carry = monthStart;
    for (let w = 0; w < 5; w++) {
      const bucket = weeksByMonth[i][w];
      bucket.startBalanceCents = carry;

      let net = 0;
      for (const entry of groupedByWeek[w]) {
        const signedDelta = Number(entry.delta || 0);
        net += signedDelta;
        if (signedDelta > 0) {
          bucket.incomeCents += signedDelta;
        } else if (signedDelta < 0) {
          const outflow = -signedDelta;
          if (entry.kind === "expense") {
            bucket.expenseCents += outflow;
          } else if (entry.kind === "goal") {
            bucket.goalCents += outflow;
          } else {
            bucket.billsCents += outflow;
          }
        }
      }

      bucket.netCents = net;
      bucket.endBalanceCents =
        bucket.startBalanceCents != null
          ? bucket.startBalanceCents + net
          : net;
      carry = bucket.endBalanceCents;
    }

    const buckets = weeksByMonth[i]
      .filter(
        (w) =>
          w.startBalanceCents != null ||
          w.incomeCents !== 0 ||
          w.billsCents !== 0 ||
          w.expenseCents !== 0 ||
          w.goalCents !== 0 ||
          w.netCents !== 0
      )
      .map((w) => ({ ...w }))
      .sort((a, b) => a.weekIndex - b.weekIndex);

    monthlyTotals[i].weeks = buckets;
    const lastWeek = buckets[buckets.length - 1];
    monthlyTotals[i].endBalanceCents =
      lastWeek?.endBalanceCents != null
        ? lastWeek.endBalanceCents
        : monthStart;
  }

  return {
    ledger,
    monthlySummary: monthlyTotals,
    finalBalancesByAccount: balances,
  };
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
