// src/lib/cashflowEngine.js

// ---------- Basic money helpers ----------
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

// ---------- Date helpers ----------
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

export function allocateIncome({
  amountCents,
  accounts,
  allocationRules,
  residualAccountId,
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

  for (const r of rules) {
    const accId = r?.accountId;
    if (!accId || !(accId in deltasByAccount)) continue;
    const ruleAmountCents = toCents(r.amount);
    if (!ruleAmountCents || ruleAmountCents <= 0) continue;
    const applied = Math.min(ruleAmountCents, remaining);
    if (applied <= 0) continue;
    deltasByAccount[accId] += applied;
    remaining -= applied;
    if (remaining <= 0) break;
  }

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

// ---------- Core projection engine ----------

/**
 * Updated for Phase 4:
 * - Accepts `expenses`
 * - Accepts `mode` ('projected' | 'actual')
 */
export function projectCashflow({
  startDate,
  months,
  accounts,
  bills,
  income,
  extraIncomes,
  expenses, // PHASE 4: Expenses array
  paySchedule,
  allocationRules,
  residualAccountId,
  paidBills,
  mode = "projected", // PHASE 4: Mode toggle
}) {
  const startDateStr = startDate || "2025-01-01";
  const projectionMonths = Math.max(1, months || 1);
  const safeAccounts = Array.isArray(accounts) ? [...accounts] : [];
  const safeBills = Array.isArray(bills) ? bills : [];
  const safePaidBills = paidBills || {};
  const incomeSafe = income || {};
  const payScheduleSafe = paySchedule || {};
  const safeExtraIncomes = Array.isArray(extraIncomes) ? extraIncomes : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : []; // PHASE 4

  const todayStr = new Date().toISOString().split("T")[0]; // For actual mode filtering

  // ---------- 1) Seed balances ----------
  const balances = {};
  safeAccounts.forEach((a) => {
    if (!a?.id) return;
    const opening = Number(a.openingBalance || 0);
    balances[a.id] = toCents(opening);
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
    payScheduleSafe
  );

  const perPayH = toCents(incomeSafe.husband || 0);
  const perPayW = toCents(incomeSafe.wife || 0);
  const perPayTotal = perPayH + perPayW;

  const salaryEvents = paydays.map((p, idx) => ({
    date: p.date,
    kind: "income",
    monthIndex: p.monthIndex,
    _sequence: idx,
    amountCents: perPayTotal,
    description: "Salary Paycheque",
  }));

  // Extra Incomes (Recurring 1st of month for simplicity in this view)
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
        });
      }
    });
  }

  const incomeEvents = [...salaryEvents, ...extraEvents];

  // ---------- 3) Build bill events ----------
  const billEvents = [];
  for (let m = 0; m < projectionMonths; m++) {
    for (const b of safeBills) {
      if (!b?.id) continue;
      const dueDay = Number.isFinite(+b.dueDay) ? +b.dueDay : 1;
      const billDate = getDateForMonthIndex(startDateStr, m, dueDay);
      const key = `${billDate}:${b.id}`;
      const isPaid = !!safePaidBills[key];

      // PHASE 4: ACTUAL MODE LOGIC
      // If we are in actual mode, and the bill is in the past, 
      // and it is NOT marked paid, we treat it as if it didn't happen 
      // (or wasn't paid from this account).
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
  const expenseEvents = safeExpenses.map((ex, idx) => {
    const date = ex.date || startDateStr;
    const mIndex = getMonthIndexFromStart(startDateStr, date);
    return {
      date,
      kind: "expense",
      monthIndex: mIndex,
      _sequence: 5000 + idx, // arbitrarily processed after income
      amountCents: toCents(ex.amount || 0),
      accountId: ex.accountId || residualId,
      description: ex.description || "Expense",
      // Expenses are inherently 'actual' so we include them
    };
  });

  // ---------- 4) Merge events & sort ----------
  const allEvents = [...incomeEvents, ...billEvents, ...expenseEvents].sort((a, b) => {
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
    const monthLabel = d.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    monthlyTotals.push({
      monthIndex: i,
      monthLabel,
      totalIncome: 0,
      totalBills: 0,
      net: 0,
    });
  }

  for (const ev of allEvents) {
    const monthIndex =
      typeof ev.monthIndex === "number"
        ? ev.monthIndex
        : getMonthIndexFromStart(startDateStr, ev.date);

    if (monthIndex < 0 || monthIndex >= projectionMonths) continue;

    if (ev.kind === "income") {
      if (ev.amountCents > 0) {
        const { deltasByAccount, appliedCents } = allocateIncome({
          amountCents: ev.amountCents,
          accounts: safeAccounts,
          allocationRules,
          residualAccountId: residualId,
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
      // (Paid bills are assumed to have been deducted already in reality, 
      // but for projection we often want to see the impact. 
      // However, typically "Paid" means "Paid from account", so we SHOULD deduct it 
      // to show the running balance dropping. 
      // The original logic filtered PAID bills as delta=0. 
      // We'll keep that logic: IsPaid -> already processed in real life -> delta=0 in projection?
      // actually, for "Projected Balance", you want to deduct EVERYTHING. 
      // But if the user is updating Opening Balance daily, they mark things paid.
      // Let's stick to the established pattern: 
      // If isPaid is true, delta is 0 (assuming Opening Balance reflects the payment).
      // If isPaid is false, delta is -amt (projected outflow).
      
      // Exception: "Expense" (One-off)
      // If it's in the past, it likely happened. If we entered it, we want to see it.
      // We treat entered expenses as "to be applied" to the running balance 
      // UNLESS they are implicit in the Opening Balance. 
      // For simplicity, we apply them to the running balance calculation here.

      if (ev.kind === "expense" || (!ev.isPaid && amt > 0)) {
        applyOutflow(balances, ev.accountId || residualId, amt);
        monthlyTotals[monthIndex].totalBills += amt;
        monthlyTotals[monthIndex].net -= amt;
        delta = -amt;
      } else {
        // Bill is paid. Assuming Opening Balance accounts for it, so 0 impact on running projection.
        delta = 0;
      }

      ledger.push({
        date: ev.date,
        kind: ev.kind,
        delta,
        balances: { ...balances },
        monthIndex,
        accountId: ev.accountId || residualId,
        billId: ev.billId,
        billName: ev.billName || ev.description,
        isPaid: !!ev.isPaid,
      });
    }
  }

  const finalBalancesByAccount = { ...balances };

  return {
    ledger,
    monthlySummary: monthlyTotals,
    finalBalancesByAccount,
  };
}