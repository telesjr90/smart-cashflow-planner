// Updated in Step 5 – Discretionary excludes savings/goal contributions
// This file is based on the original Home.jsx from the Smart Cash Flow Planner
// repository. It has been modified to add a notification card for pending
// shared goals and budgets requiring partner approval. The component now accepts
// `pendingGoalsCount` and `pendingBudgetsCount` props and a callback
// `onGoToReviewPending` which navigates to the appropriate section in
// Settings when the user has items to review.

import React, { useMemo } from "react";
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Plus,
  ChevronRight,
} from "lucide-react";

import { projectCashflow, fromCents } from "../lib/cashflowEngine.js";

/**
 * EXPECTED PROPS:
 * - role: 'H' | 'W'                          // current user's role
 * - personScope: 'self' | 'partner' | 'both'
 * - setPersonScope: (v) => void
 * - startDate: ISO string of plan start
 * - bills: Array of bills
 * - paidFlags: { [billId: string]: { [monthIndex: number]: boolean } }
 * - discretionaryLeft: number    // PHASE 4: wire into engine
 * - savingsToDate: number
 * - budgets: Array<{ id, name, remaining: number }>
 * - onTogglePaid?: ({ bill, monthIndex }) => void
 * - onAddExpense?: ({ amount, category, date }) => void
 * - mode: 'projected' | 'actual'
 * - setMode: (v) => void
 * - income?: { husband: number, wife: number }
 * - paySchedule?: { type: "semi-monthly", day1: number, day2: number|"last" }
 * - pendingGoalsCount?: number               // NEW: number of pending shared goals
 * - pendingBudgetsCount?: number            // NEW: number of pending shared budgets
 * - onGoToReviewPending?: () => void        // NEW: navigate to review pending items
 */

const DEFAULT_START_DATE = "2025-11-15";

const fmt = (v) =>
  `$${Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const todayISO = () => new Date().toISOString().split("T")[0];

// Neutral fallback income: default to zero to avoid showing example numbers
const FALLBACK_INCOME = {
  husband: 0,
  wife: 0,
};

const FALLBACK_PAY_SCHEDULE = {
  type: "semi-monthly",
  day1: 15,
  day2: "last",
};

function upToNextSunday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const end = new Date(d);
  end.setDate(d.getDate() + diff);
  return end.toISOString().slice(0, 10);
}

function weekRangeLabel(startISO) {
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(upToNextSunday(startISO) + "T00:00:00");
  const fmtShort = (d) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${fmtShort(start)} – ${fmtShort(end)}`;
}

function weekOfMonth(date, monthStartISO) {
  const d = new Date(date + "T00:00:00");
  const m0 = new Date(monthStartISO + "T00:00:00");
  const diff = d.getDate() - m0.getDate();
  return Math.floor(diff / 7);
}

function isSameMonth(dateISO, monthStartISO) {
  const d = new Date(dateISO + "T00:00:00");
  const m = new Date(monthStartISO + "T00:00:00");
  return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
}

function currentMonthStart(startDate) {
  if (!startDate) return DEFAULT_START_DATE;
  const s = new Date(startDate + "T00:00:00");
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - s.getFullYear()) * 12 +
    (now.getMonth() - s.getMonth());
  const d = new Date(s.getFullYear(), s.getMonth() + monthsDiff, 1);
  return d.toISOString().slice(0, 10);
}

function clampDueDayToMonth(dueDay, monthStartISO) {
  const m = new Date(monthStartISO + "T00:00:00");
  const lastDayOfMonth = new Date(
    m.getFullYear(),
    m.getMonth() + 1,
    0
  ).getDate();
  if (!dueDay) return 1;
  return Math.min(Math.max(dueDay, 1), lastDayOfMonth);
}

function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (
    (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth())
  );
}

export default function Home({
  role = "H",
  personScope = "self",
  setPersonScope = () => {},
  startDate = DEFAULT_START_DATE,
  bills = [],
  paidFlags = {},
  savingsToDate = 0,
  budgets = [],
  onTogglePaid,
  onAddExpense,
  // PHASE 4 PROP: We need expenses passed to Home to calculate the Summary accurately
  expenses = [],
  mode = "projected",
  setMode = () => {},
  income,
  paySchedule,
  accounts = [],
  allocationRules = [],
  residualAccountId = null,
  startingBalance = 0,
  // NEW: navigation callbacks for empty state/onboarding
  onGoToSettings = () => {},
  onGoToBills = () => {},
  // Navigate to budgets section in Settings
  onGoToSettingsBudgets = () => {},
  // NEW: counts and callback for pending shared items
  pendingGoalsCount = 0,
  pendingBudgetsCount = 0,
  onGoToReviewPending = () => {},
}) {
  // Determine whether the plan needs setup. Only show onboarding when no
  // meaningful data exists across income, bills and expenses. Previously the
  // condition short-circuited if either income was zero/missing or no bills were
  // present, which prevented the dashboard from showing when a user had
  // configured income or added expenses but not yet entered bills. Here we
  // compute flags for each data type separately and require all to be empty
  // before triggering the onboarding UI.
  const hasIncome =
    income &&
    (Number(income.husband || 0) > 0 || Number(income.wife || 0) > 0);
  const hasBills = Array.isArray(bills) && bills.length > 0;
  const hasExpenses = Array.isArray(expenses) && expenses.length > 0;
  // Show onboarding only when there is no income, no bills and no expenses
  const needsSetup = !hasIncome && !hasBills && !hasExpenses;

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-slate-50 pb-16">
        <div className="max-w-md mx-auto px-4 pt-10 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Let&apos;s set up your plan
              </h1>
              <p className="text-sm text-slate-600">
                Start by adding your household income, pay schedule, and first
                bills. Once that&apos;s done, this page will show a live view of
                your shared plan.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onGoToSettings}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-xs font-medium px-3 py-2 shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
              >
                Go to Settings
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoToBills}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 text-white text-xs font-medium px-3 py-2 shadow-sm hover:bg-slate-800 active:bg-slate-900"
              >
                Add first bills
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              You can always tweak things later – the goal is to get a rough
              plan in place so both partners can see the same picture.
            </p>
          </div>

          <div className="text-[11px] text-slate-500">
            Once you&apos;ve added income and at least one bill, this Home
            screen will show:
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Projected vs. actual cash left this month</li>
              <li>Upcoming bills and quick actions</li>
              <li>Budgets and savings progress toward your shared goals</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const monthStart = currentMonthStart(startDate);
  const weekLabel = weekRangeLabel(monthStart);

  // Weekly view stats: how many bills and overspent categories this week
  const { billsThisWeek, overspentCats } = useMemo(() => {
    const mStart = new Date(monthStart + "T00:00:00");
    const mEnd = new Date(mStart);
    mEnd.setDate(mStart.getDate() + 6);

    const start = mStart;
    const end = mEnd;

    const billsThisWeek = (bills || []).filter((b) => {
      if (!b || (!b.date && !b.dueDay)) return false;
      const billDate = new Date(
        `${monthStart.slice(0, 8)}${String(b.dueDay).padStart(2, "0")}T00:00:00`
      );
      return billDate >= start && billDate <= end;
    }).length;

    const overspentCats = (budgets || []).filter(
      (c) => (c.remaining ?? 0) <= 0
    ).length;
    return { billsThisWeek, overspentCats };
  }, [bills, monthStart, budgets]);

  const {
    monthlyIncome,
    monthlyBills,
    monthlyNet,
    contributionsThisMonth,
  } = useMemo(() => {
    if (!startDate) {
      return {
        monthlyIncome: 0,
        monthlyBills: 0,
        monthlyNet: 0,
        contributionsThisMonth: 0,
      };
    }

    const effectiveStart =
      startDate && startDate.length >= 10 ? startDate : DEFAULT_START_DATE;

    const effIncome = {
      husband:
        income && Number.isFinite(+income?.husband)
          ? +income.husband
          : FALLBACK_INCOME.husband,
      wife:
        income && Number.isFinite(+income?.wife)
          ? +income.wife
          : FALLBACK_INCOME.wife,
    };

    const effSchedule = {
      type: paySchedule?.type || FALLBACK_PAY_SCHEDULE.type,
      day1:
        paySchedule?.day1 != null
          ? paySchedule.day1
          : FALLBACK_PAY_SCHEDULE.day1,
      day2:
        paySchedule?.day2 != null
          ? paySchedule.day2
          : FALLBACK_PAY_SCHEDULE.day2,
    };

    try {
      const monthsToProject = 6;

      const result = projectCashflow({
        startDate: effectiveStart,
        months: monthsToProject,
        accounts: accounts || [],
        bills,
        income: effIncome,
        paySchedule: effSchedule,
        allocationRules: allocationRules || [],
        residualAccountId: residualAccountId || null,
        paidBills: {},
        // PHASE 4 WIRING
        expenses,
        mode, // Pass mode to respect "Actual" filter on Home dashboard too
      });

      const ledger = result.ledger || [];
      const monthlySummary = result.monthlySummary || [];

      if (!monthlySummary.length) {
        return {
          monthlyIncome: 0,
          monthlyBills: 0,
          monthlyNet: 0,
          contributionsThisMonth: 0,
        };
      }

      const currentIdx = getMonthIndexFromStart(effectiveStart, todayISO());

      const summaryForCurrent =
        monthlySummary.find((m) => m.monthIndex === currentIdx) ||
        monthlySummary[0];

      if (!summaryForCurrent) {
        return {
          monthlyIncome: 0,
          monthlyBills: 0,
          monthlyNet: 0,
          contributionsThisMonth: 0,
        };
      }

      // Step 5 – compute how much income was routed into savings/goal accounts
      let contributionsCents = 0;

      const savingsAccountIds = (accounts || [])
        .filter(
          (a) =>
            a &&
            (a.type === "savings" ||
              a.type === "goal" ||
              a.type === "savings-goal")
        )
        .map((a) => a.id)
        .filter(Boolean);

      if (ledger.length && savingsAccountIds.length) {
        const monthStartStr = currentMonthStart(effectiveStart);
        const monthStartDate = new Date(monthStartStr + "T00:00:00");
        const nextMonthStart = new Date(
          monthStartDate.getFullYear(),
          monthStartDate.getMonth() + 1,
          1
        );

        let prevBalances = {};

        for (const ev of ledger) {
          if (!ev || !ev.date) continue;
          const d = new Date(ev.date + "T00:00:00");

          if (d < monthStartDate) {
            if (ev.balances) prevBalances = ev.balances;
            continue;
          }

          if (d >= nextMonthStart) {
            break;
          }

          const balances = ev.balances || {};
          savingsAccountIds.forEach((id) => {
            const prev = prevBalances[id] || 0;
            const curr = balances[id] || 0;
            const delta = curr - prev;
            if (delta > 0) {
              contributionsCents += delta;
            }
          });
          prevBalances = balances;
        }
      }

      const incomeVal = Number(fromCents(summaryForCurrent.totalIncome));
      const billsVal = Number(fromCents(summaryForCurrent.totalBills));
      const netVal = Number(fromCents(summaryForCurrent.net));
      const contribVal = Number(fromCents(contributionsCents));

      return {
        monthlyIncome: incomeVal,
        monthlyBills: billsVal,
        monthlyNet: netVal,
        contributionsThisMonth: contribVal,
      };
    } catch (e) {
      console.warn("Home monthly engine projection failed", e);
      return {
        monthlyIncome: 0,
        monthlyBills: 0,
        monthlyNet: 0,
        contributionsThisMonth: 0,
      };
    }
  }, [
    startDate,
    bills,
    income,
    paySchedule,
    expenses,
    mode,
    accounts,
    allocationRules,
    residualAccountId,
  ]);

  // Step 5 – Discretionary excludes savings/goal contributions.
  // Start from the household's starting balances plus this month's net change,
  // then subtract any contributions routed into savings/goal accounts.
  const startingBalanceForHousehold =
    (accounts && accounts.length
      ? accounts.reduce(
          (sum, a) => sum + (Number(a.openingBalance || 0) || 0),
          0
        )
      : Number(startingBalance || 0) || 0);

  const monthlyNetForCurrentMonth = monthlyNet || 0;
  const discretionaryLeftValue =
    startingBalanceForHousehold +
    monthlyNetForCurrentMonth -
    (contributionsThisMonth || 0);

  const canToggleBill = (bill) => {
    if (!bill) return false;
    if (!bill.payer || bill.payer === "AUTO") return true;
    return bill.payer === role;
  };

  const renderedBills = (bills || [])
    .slice()
    .sort((a, b) => {
      const aDay = clampDueDayToMonth(a.dueDay, monthStart);
      const bDay = clampDueDayToMonth(b.dueDay, monthStart);
      return aDay - bDay;
    });

  const monthIndexForCurrentMonth = getMonthIndexFromStart(
    startDate,
    monthStart
  );

  const pendingCount = (pendingGoalsCount || 0) + (pendingBudgetsCount || 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="bg-slate-900 text-white rounded-3xl p-4 pb-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Cash Flow Overview
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-semibold">
                  {fmt(discretionaryLeftValue)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {mode === "projected"
                    ? "projected cash left this month"
                    : "actual cash left so far"}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="inline-flex items-center rounded-full bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("projected")}
                  className={`px-2.5 py-1 text-[10px] rounded-full font-medium ${
                    mode === "projected"
                      ? "bg-white text-slate-900"
                      : "text-slate-300"
                  }`}
                >
                  Projected
                </button>
                <button
                  type="button"
                  onClick={() => setMode("actual")}
                  className={`px-2.5 py-1 text-[10px] rounded-full font-medium ${
                    mode === "actual"
                      ? "bg-white text-slate-900"
                      : "text-slate-300"
                  }`}
                >
                  Actual
                </button>
              </div>
              <PersonScopeToggle
                personScope={personScope}
                setPersonScope={setPersonScope}
              />
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 flex items-start gap-2">
              <div className="mt-0.5">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                  Partner review needed
                </div>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  {pendingGoalsCount > 0 && pendingBudgetsCount > 0
                    ? `${pendingGoalsCount} shared goal${
                        pendingGoalsCount > 1 ? "s" : ""
                      } and ${pendingBudgetsCount} budget${
                        pendingBudgetsCount > 1 ? "s" : ""
                      } are waiting for your approval.`
                    : pendingGoalsCount > 0
                    ? `${pendingGoalsCount} shared goal${
                        pendingGoalsCount > 1 ? "s" : ""
                      } ${pendingGoalsCount > 1 ? "are" : "is"} waiting for your approval.`
                    : `${pendingBudgetsCount} budget${
                        pendingBudgetsCount > 1 ? "s" : ""
                      } ${pendingBudgetsCount > 1 ? "are" : "is"} waiting for your approval.`}
                </p>
                <button
                  type="button"
                  onClick={onGoToReviewPending}
                  className="inline-flex items-center mt-1.5 text-[11px] font-semibold text-amber-900 hover:text-amber-950"
                >
                  Review now
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                This week
              </h2>
              <p className="text-[11px] text-slate-500">{weekLabel}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="bg-slate-900 text-white rounded-2xl p-2.5 flex flex-col justify-between">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Bills this week
              </div>
              <div className="text-sm font-semibold mt-1">{billsThisWeek}</div>
            </div>
            <div className="bg-rose-50 text-rose-900 rounded-2xl p-2.5 flex flex-col justify-between border border-rose-100">
              <div className="text-[10px] uppercase tracking-wide text-rose-500">
                Overspent budgets
              </div>
              <div className="text-sm font-semibold mt-1">
                {overspentCats || 0}
              </div>
            </div>
            <div className="bg-emerald-50 text-emerald-900 rounded-2xl p-2.5 flex flex-col justify-between border border-emerald-100">
              <div className="text-[10px] uppercase tracking-wide text-emerald-500">
                Saved toward goals
              </div>
              <div className="text-sm font-semibold mt-1">
                {fmt(savingsToDate)}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Budgets &amp; goals
              </h2>
              <p className="text-[11px] text-slate-500">
                How your plan maps to spending and savings targets
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-1">
            {budgets && budgets.length > 0 ? (
              budgets.map((b) => (
                <div
                  key={b.id || b.name}
                  className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-2 h-2 text-slate-400" />
                    <span className="text-slate-700 font-medium">
                      {b.name}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    {fmt(b.remaining)} / {fmt(b.total)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500">
                No budgets yet. You can configure shared and personal budgets in
                Settings, and they will appear here.
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
              <div className="text-[11px] text-slate-500">
                Saved toward goals so far
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {fmt(savingsToDate)}
              </div>
            </div>

            <button
              type="button"
              onClick={onGoToSettingsBudgets}
              className="inline-flex items-center justify-center mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage budgets &amp; goals
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Upcoming bills
              </h2>
              <p className="text-[11px] text-slate-500">
                Next few bills in your plan
              </p>
            </div>
          </div>

          {renderedBills.length > 0 ? (
            <div className="space-y-2 mt-1">
              {renderedBills.slice(0, 5).map((bill) => {
                const dueDay = clampDueDayToMonth(bill.dueDay, monthStart);
                const billDateISO = `${monthStart.slice(
                  0,
                  8
                )}${String(dueDay).padStart(2, "0")}`;
                const isPaid =
                  !!paidFlags[bill.id]?.[monthIndexForCurrentMonth] ||
                  bill.isPaid ||
                  false;

                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canToggleBill(bill)}
                        onClick={() =>
                          onTogglePaid &&
                          canToggleBill(bill) &&
                          onTogglePaid(bill, monthIndexForCurrentMonth, !isPaid)
                        }
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${
                          isPaid
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 text-transparent"
                        }`}
                      >
                        ✓
                      </button>
                      <div>
                        <div className="text-slate-800 font-medium">
                          {bill.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isSameMonth(billDateISO, monthStart)
                            ? `Day ${dueDay}`
                            : billDateISO}
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-800 font-semibold">
                      {fmt(bill.amount)}
                    </div>
                  </div>
                );
              })}
              {renderedBills.length > 5 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  +{renderedBills.length - 5} more bills not shown
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">
              No bills added yet. Add bills from the Bills tab to see them here.
            </p>
          )}
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Quick actions
              </h2>
              <p className="text-[11px] text-slate-500">
                Common things you might want to do next
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center px-3 py-2 rounded-2xl bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add a one-off expense
            </button>
            <button
              type="button"
              onClick={onGoToSettingsBudgets}
              className="inline-flex items-center px-3 py-2 rounded-2xl bg-slate-100 text-slate-800 text-[11px] font-medium hover:bg-slate-200"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Adjust budgets
            </button>
            <button
              type="button"
              onClick={onGoToSettings}
              className="inline-flex items-center px-3 py-2 rounded-2xl bg-slate-100 text-slate-800 text-[11px] font-medium hover:bg-slate-200"
            >
              <Wallet className="w-3 h-3 mr-1" />
              Edit income &amp; pay schedule
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function PersonScopeToggle({ personScope, setPersonScope }) {
  return (
    <Segmented
      value={personScope}
      onChange={setPersonScope}
      options={[
        { value: "self", label: "Me" },
        { value: "both", label: "Household" },
        { value: "partner", label: "Partner" },
      ]}
    />
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-800 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
