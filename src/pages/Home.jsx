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

function clampDueDayToMonth(year, month, dueDay) {
  const last = new Date(year, month + 1, 0).getDate();
  return Math.min(dueDay, last);
}

function next7DayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition-colors ${
              active
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
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

function SummaryBar({
  mode,
  setMode,
  personScope,
  setPersonScope,
  discretionaryLeft = 0,
  kpis = { billsThisWeek: 0, overspentCats: 0, savingsToDate: 0 },
}) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/95 border-b border-slate-200">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-indigo-600" size={18} />
            <div>
              <div className="text-[11px] text-slate-500">
                Discretionary left
              </div>
              <div className="text-lg font-bold text-slate-900">
                {fmt(discretionaryLeft)}
              </div>
            </div>
          </div>

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "projected", label: "Projected" },
              { value: "actual", label: "Actual" },
            ]}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                kpis.billsThisWeek
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {kpis.billsThisWeek ? (
                <AlertTriangle size={11} />
              ) : (
                <CheckCircle2 size={11} />
              )}
              <span>
                {kpis.billsThisWeek
                  ? `${kpis.billsThisWeek} bill${
                      kpis.billsThisWeek > 1 ? "s" : ""
                    } this week`
                  : "No bills due this week"}
              </span>
            </span>
          </div>

          <PersonScopeToggle
            personScope={personScope}
            setPersonScope={setPersonScope}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <div>
            Overspent categories: {" "}
            <span
              className={
                kpis.overspentCats > 0
                  ? "font-semibold text-amber-700"
                  : "font-semibold text-emerald-700"
              }
            >
              {kpis.overspentCats}
            </span>
          </div>
          <div>
            Savings to date: {" "}
            <span className="font-semibold text-slate-800">
              {fmt(kpis.savingsToDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PastDueBanner({ items }) {
  if (!items || !items.length) return null;
  const total = items.reduce((sum, b) => sum + (b.amount || 0), 0);
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2 items-start">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">
          {items.length} bill{items.length > 1 ? "s" : ""} overdue
        </div>
        <div className="mt-0.5">
          Total overdue: <span className="font-semibold">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

function UpcomingBillsList({ items, onAddExpense }) {
  return (
    <section className="max-w-md mx-auto px-4 mt-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-slate-500 font-semibold">
            Coming up this week
          </div>
          <button
            type="button"
            onClick={onAddExpense}
            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium"
          >
            <Plus size={12} />
            Add one-off expense
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-slate-500 py-1.5">
            No bills due in the next 7 days.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((b) => (
              <li
                key={b.id}
                className="py-1.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                    {b.dueDay}
                  </span>
                  <div>
                    <div className="text-xs font-medium text-slate-800">
                      {b.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {b.payer === "H" ? "Partner H" : "Partner W"} • {" "}
                      {b.category || "Other"}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {fmt(b.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function BillsByStatus({ upcoming, paidThisMonth, unpaidThisMonth }) {
  return (
    <section className="max-w-md mx-auto px-4 mt-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-[11px] text-slate-500 font-semibold mb-1.5">
          This month&apos;s bills
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
          <div>
            Upcoming: {" "}
            <span className="font-semibold text-slate-800">
              {upcoming.length}
            </span>
          </div>
          <div>
            Paid: {" "}
            <span className="font-semibold text-emerald-700">
              {paidThisMonth.length}
            </span>
          </div>
          <div>
            Unpaid: {" "}
            <span className="font-semibold text-rose-700">
              {unpaidThisMonth.length}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Tap a bill in the Planner tab to mark as paid.
        </div>
      </div>
    </section>
  );
}

function CategoryBadges({ budgets }) {
  if (!budgets || budgets.length === 0) {
    return (
      <div className="mt-2 text-[11px] text-slate-500">
        No category budgets set yet.
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {budgets.map((b) => {
        const remaining = b.remaining ?? 0;
        const isOverspent = remaining <= 0;
        return (
          <div
            key={b.id}
            className={`px-2 py-1 rounded-full text-[10px] border ${
              isOverspent
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {b.name}: {" "}
            <span className="font-semibold">
              {fmt(Math.max(0, remaining))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function KPICard({ monthlyIncome, monthlyBills, monthlyNet }) {
  return (
    <section className="max-w-md mx-auto px-4 mt-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-slate-500 font-semibold">
            This month (projected)
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Circle className="w-2 h-2 text-emerald-500 fill-emerald-500" />
            <span>Income - Bills</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
          <div>
            <div className="text-slate-500">Income</div>
            <div className="font-semibold text-slate-900">
              {fmt(monthlyIncome)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Bills</div>
            <div className="font-semibold text-slate-900">
              {fmt(monthlyBills)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Net</div>
            <div className="font-semibold text-slate-900">
              {fmt(monthlyNet)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper to get month index difference
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
  // condition short‑circuited if either income was zero/missing or no bills were
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
              <p className="text-xs text-slate-500 mt-1">
                Start by adding your income, pay schedule, and first bills in
                Settings.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onGoToSettings}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-medium px-3 py-2 shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
              >
                Go to Settings
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoToBills}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium px-3 py-2 hover:bg-slate-200 active:bg-slate-300"
              >
                Add your first bill
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const monthStart = useMemo(
    () => currentMonthStart(startDate || DEFAULT_START_DATE),
    [startDate]
  );

  // Upcoming (7 days) for CURRENT USER (role) or household
  const { upcomingForUser, overdueForUser } = useMemo(() => {
    const { start, end } = next7DayWindow();
    const all = bills || [];
    const filteredByScope = all.filter((b) => {
      if (personScope === "both") return true;
      if (personScope === "self") {
        return b.payer === (role === "H" ? "H" : "W");
      }
      // partner
      return b.payer !== (role === "H" ? "H" : "W");
    });

    const upcoming = [];
    const overdue = [];

    filteredByScope.forEach((b) => {
      const billDate = new Date(
        `${monthStart.slice(0, 8)}${String(b.dueDay).padStart(2, "0")}T00:00:00`
      );
      if (billDate >= start && billDate <= end) {
        upcoming.push(b);
      }
      if (billDate < start) {
        overdue.push(b);
      }
    });

    return { upcomingForUser: upcoming, overdueForUser: overdue };
  }, [bills, role, personScope, monthStart]);

  const kpis = useMemo(() => {
    const { start, end } = next7DayWindow();
    const billsThisWeek = (bills || []).filter((b) => {
      const billDate = new Date(
        `${monthStart.slice(0, 8)}${String(b.dueDay).padStart(2, "0")}T00:00:00`
      );
      return billDate >= start && billDate <= end;
    }).length;

    const overspentCats = (budgets || []).filter(
      (c) => (c.remaining ?? 0) <= 0
    ).length;
    return { billsThisWeek, overspentCats, savingsToDate };
  }, [bills, monthStart, budgets, savingsToDate]);

  const { monthlyIncome, monthlyBills, monthlyNet } = useMemo(() => {
    if (!startDate) {
      return { monthlyIncome: 0, monthlyBills: 0, monthlyNet: 0 };
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

      const { monthlySummary } = projectCashflow({
        startDate: effectiveStart,
        months: monthsToProject,
        accounts: [],
        bills,
        income: effIncome,
        paySchedule: effSchedule,
        allocationRules: [],
        residualAccountId: null,
        paidBills: {},
        // PHASE 4 WIRING
        expenses,
        mode, // Pass mode to respect "Actual" filter on Home dashboard too
      });

      if (!monthlySummary || monthlySummary.length === 0) {
        return { monthlyIncome: 0, monthlyBills: 0, monthlyNet: 0 };
      }

      const currentIdx = getMonthIndexFromStart(effectiveStart, todayISO());

      const summaryForCurrent =
        monthlySummary.find((m) => m.monthIndex === currentIdx) ||
        monthlySummary[0];

      if (!summaryForCurrent) {
        return { monthlyIncome: 0, monthlyBills: 0, monthlyNet: 0 };
      }

      const incomeVal = Number(fromCents(summaryForCurrent.totalIncome));
      const billsVal = Number(fromCents(summaryForCurrent.totalBills));
      const netVal = Number(fromCents(summaryForCurrent.net));

      return {
        monthlyIncome: incomeVal,
        monthlyBills: billsVal,
        monthlyNet: netVal,
      };
    } catch (e) {
      console.warn("Home monthly engine projection failed", e);
      return { monthlyIncome: 0, monthlyBills: 0, monthlyNet: 0 };
    }
  }, [startDate, bills, income, paySchedule, expenses, mode]);

  // For now, treat monthlyNet from the projection engine as the
  // high-level "discretionary left" number on the Home summary.
  // This already respects `mode` and includes expenses when present.
  const discretionaryLeftValue = monthlyNet;

  // Toggle rules: user can only toggle their own bills
  const canToggle = (bill) => bill.payer === role;

  return (
    <div className="min-h-svh bg-slate-50">
      <SummaryBar
        mode={mode}
        setMode={setMode}
        personScope={personScope}
        setPersonScope={setPersonScope}
        discretionaryLeft={discretionaryLeftValue}
        kpis={kpis}
      />

      {/* Notification for pending shared goals/budgets */}
      {typeof pendingGoalsCount === "number" &&
      typeof pendingBudgetsCount === "number" &&
      (pendingGoalsCount > 0 || pendingBudgetsCount > 0) ? (
        <section className="max-w-md mx-auto px-4 pt-3">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-800 flex items-center justify-between">
            <div>
              You have {pendingGoalsCount} shared goal{pendingGoalsCount !== 1 ? "s" : ""} and {pendingBudgetsCount} shared budget{pendingBudgetsCount !== 1 ? "s" : ""} to review.
            </div>
            <button
              type="button"
              onClick={() => onGoToReviewPending()}
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
            >
              Review now
            </button>
          </div>
        </section>
      ) : null}

      <section className="max-w-md mx-auto px-4 pt-3 pb-1">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] text-slate-500">
              This month&apos;s budgets
            </div>
            {typeof onGoToSettingsBudgets === "function" && (
              <button
                type="button"
                onClick={() => onGoToSettingsBudgets()}
                className="text-[10px] text-indigo-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <CategoryBadges budgets={budgets} />
        </div>
      </section>

      <KPICard
        monthlyIncome={monthlyIncome}
        monthlyBills={monthlyBills}
        monthlyNet={monthlyNet}
      />

      <PastDueBanner items={overdueForUser} />

      <UpcomingBillsList items={upcomingForUser} onAddExpense={onAddExpense} />

      {/* Simple monthly bill status overview */}
      <BillsByStatus
        upcoming={upcomingForUser}
        paidThisMonth={[]} // Could be wired from paidFlags if needed
        unpaidThisMonth={[]} // For now we just use the quick counts above
      />

      {/* Placeholder for more detailed upcoming/actual breakdown if needed */}
      <section className="max-w-md mx-auto px-4 mt-3 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] text-slate-500 font-semibold">
              See detailed plan
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500">
            Go to the Planner tab to see your day-by-day cashflow, bill
            payments, and weekly discretionary envelope.
          </div>
        </div>
      </section>
    </div>
  );
}