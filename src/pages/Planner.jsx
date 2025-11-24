// Updated to fix starting balance + actual mode wiring
// src/pages/Planner.jsx
import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import {
  projectCashflow,
  fromCents,
  getDateForMonthIndex,
} from "../lib/cashflowEngine.js";

const DEFAULT_START_DATE = "2025-11-15";

function TagPill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Simple segmented toggle component. Displays a list of options and highlights
 * the active one. When clicked, calls onChange with the option's value.
 * Mirrors the implementation used on the Home page to keep a consistent look
 * and feel across the app. If onChange is undefined, the control becomes
 * inert and simply displays the current mode.
 */
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => {
              if (typeof onChange === "function") onChange(opt.value);
            }}
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

export default function Planner({
  startDate,
  accounts = [],
  residualAccountId,
  allocationRules = [],
  income = {},
  paySchedule,
  bills = [],
  paidBills = {},
  mode = "projected",
  setMode,
  extraIncomes = [],
  // PHASE 4: Expenses prop
  expenses = [],
}) {
  const effectiveStartDate =
    startDate && startDate.length >= 10 ? startDate : DEFAULT_START_DATE;
  const monthsToProject = 3;
  const [monthOffset, setMonthOffset] = useState(0);

  const fallbackAccounts =
    accounts && accounts.length > 0
      ? accounts
      : [
          {
            id: residualAccountId || "cheq",
            name: "Chequing",
            type: "deposit",
            openingBalance: 0,
          },
        ];

  const effectiveResidualId =
    residualAccountId || fallbackAccounts[0]?.id || "cheq";

  const billById = useMemo(() => {
    const map = {};
    (bills || []).forEach((b) => {
      if (b && b.id) map[b.id] = b;
    });
    return map;
  }, [bills]);

  const projection = useMemo(() => {
    if (!effectiveStartDate)
      return { ledger: [], monthlySummary: [], finalBalancesByAccount: {} };

    try {
      return projectCashflow({
        startDate: effectiveStartDate,
        months: monthsToProject,
        accounts: fallbackAccounts,
        bills,
        income,
        paySchedule,
        allocationRules,
        residualAccountId: effectiveResidualId,
        paidBills,
        extraIncomes,
        // PHASE 4 Wiring
        expenses,
        mode,
      });
    } catch (e) {
      console.warn("Planner: projectCashflow failed", e);
      return { ledger: [], monthlySummary: [], finalBalancesByAccount: {} };
    }
  }, [
    effectiveStartDate,
    monthsToProject,
    fallbackAccounts,
    bills,
    income,
    paySchedule,
    allocationRules,
    effectiveResidualId,
    paidBills,
    extraIncomes,
    expenses, // Dep
    mode, // Dep
  ]);

  const { ledger = [], monthlySummary = [], finalBalancesByAccount = {} } =
    projection;
  const clampedMonthOffset = Math.min(
    Math.max(monthOffset, 0),
    Math.max((monthlySummary?.length || 1) - 1, 0)
  );
  const activeMonthSummary =
    monthlySummary && monthlySummary[clampedMonthOffset];

  const activeMonthDateStr = getDateForMonthIndex(
    effectiveStartDate,
    clampedMonthOffset,
    1
  );
  const activeMonthDate = new Date(`${activeMonthDateStr}T00:00:00`);
  const activeYear = activeMonthDate.getFullYear();
  const activeMonthIndex0 = activeMonthDate.getMonth();
  const monthLabel = activeMonthDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const daysInActiveMonth = new Date(
    activeYear,
    activeMonthIndex0 + 1,
    0
  ).getDate();

  const weeks = useMemo(() => {
    if (!ledger || ledger.length === 0) return [];
    const eventsForMonth = (ledger || []).filter((ev) => {
      const d = new Date(`${ev.date}T00:00:00`);
      return (
        d.getFullYear() === activeYear && d.getMonth() === activeMonthIndex0
      );
    });

    if (eventsForMonth.length === 0) return [];

    const weekMap = new Map();
    for (const ev of eventsForMonth) {
      const d = new Date(`${ev.date}T00:00:00`);
      // Week index: 0-based; each week is a block of 7 days starting at 1.
      const weekIndex = Math.floor((d.getDate() - 1) / 7);
      if (!weekMap.has(weekIndex)) weekMap.set(weekIndex, []);
      weekMap.get(weekIndex).push(ev);
    }

    const result = [];
    for (const [weekIndex, items] of weekMap.entries()) {
      const weekStartDay = weekIndex * 7 + 1;
      const weekEndDay = Math.min(weekStartDay + 6, daysInActiveMonth);
      let incomeCents = 0;
      let billsCents = 0;
      let endBalances = null;

      items.forEach((ev) => {
        if (ev.kind === "income") incomeCents += ev.delta;
        else if (ev.kind === "bill" || ev.kind === "expense")
          billsCents += Math.abs(ev.delta);
        endBalances = ev.balances;
      });

      const billsOnly = items.filter((ev) => ev.kind === "bill");
      const paidCount = billsOnly.filter((b) => b.isPaid).length;
      const unpaidCount = billsOnly.length - paidCount;

      result.push({
        weekIndex,
        rangeLabel: `${weekStartDay}–${weekEndDay}`,
        incomeCents,
        billsCents,
        netCents: incomeCents - billsCents,
        items,
        endBalances,
        paidCount,
        unpaidCount,
      });
    }
    return result.sort((a, b) => a.weekIndex - b.weekIndex);
  }, [ledger, activeYear, activeMonthIndex0, daysInActiveMonth]);

  // Sum of real account balances (as entered by the user)
  const startingBalanceForHousehold = useMemo(
    () =>
      (accounts || []).reduce(
        (sum, a) => sum + (Number(a.openingBalance || 0) || 0),
        0
      ),
    [accounts]
  );

  // Derive start-of-month and end-of-month balances from the ledger.
  // In "projected" mode we use the engine's ledger for both.
  // In "actual" mode we:
  //   - use the ledger (which includes the opening event) for start-of-month,
  //   - show the real account balances for the end-of-month display.
  const { startBalanceCents, endBalanceCents } = useMemo(() => {
    const centsFromAccounts = Math.round(
      (startingBalanceForHousehold || 0) * 100
    );

    // If there is no ledger data at all, fall back entirely to accounts in actual mode.
    if (!ledger || ledger.length === 0) {
      if (mode === "actual") {
        return {
          startBalanceCents: centsFromAccounts,
          endBalanceCents: centsFromAccounts,
        };
      }
      return { startBalanceCents: 0, endBalanceCents: 0 };
    }

    const monthStart = new Date(`${activeMonthDateStr}T00:00:00`);
    const nextMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1
    );

    let lastBefore = null;
    let lastInMonth = null;

    for (const ev of ledger) {
      const d = new Date(`${ev.date}T00:00:00`);
      if (d < monthStart) {
        if (!lastBefore || d >= new Date(`${lastBefore.date}T00:00:00`)) {
          lastBefore = ev;
        }
      } else if (d >= monthStart && d < nextMonthStart) {
        if (!lastInMonth || d >= new Date(`${lastInMonth.date}T00:00:00`)) {
          lastInMonth = ev;
        }
      }
    }

    const sumBalances = (balances) =>
      Object.values(balances || {}).reduce(
        (acc, v) => acc + (Number.isFinite(Number(v)) ? Number(v) : 0),
        0
      );

    const startSource = lastBefore || ledger[0];
    const startFromLedger = startSource ? sumBalances(startSource.balances) : 0;

    const endSource = lastInMonth || startSource;
    const endFromLedger = endSource
      ? sumBalances(endSource.balances)
      : startFromLedger;

    if (mode === "actual") {
      return {
        // Use engine + opening event for the "start-of-month" snapshot
        startBalanceCents: startFromLedger,
        // But show the user's real account balances as the "actual" balance
        endBalanceCents: centsFromAccounts,
      };
    }

    // Projected mode: use the engine's ledger balances.
    return { startBalanceCents: startFromLedger, endBalanceCents: endFromLedger };
  }, [ledger, activeMonthDateStr, mode, startingBalanceForHousehold]);

  function handlePrevMonth() {
    setMonthOffset((prev) => Math.max(prev - 1, 0));
  }
  function handleNextMonth() {
    const maxOffset = Math.max((monthlySummary?.length || 1) - 1, 0);
    setMonthOffset((prev) => Math.min(prev + 1, maxOffset));
  }

  const hasProjectionData =
    (monthlySummary && monthlySummary.length > 0) || (ledger && ledger.length);

  return (
    <div className="px-4 pb-20 space-y-4">
      <div className="flex items-center justify-between pt-3">
        <div>
          <div className="text-xs text-slate-500">Planner</div>
          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1">
            <CalendarDays size={14} />
            <span>{monthLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <TagPill className="bg-slate-100 text-slate-700">
          <Wallet className="w-3 h-3 mr-1" />
          Cash flow plan
        </TagPill>

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "projected", label: "Projected" },
            { value: "actual", label: "Actual" },
          ]}
        />
      </div>

      {hasProjectionData && activeMonthSummary && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-slate-500 mb-0.5">Income</div>
              <div className="text-slate-900 font-semibold">
                ${fromCents(activeMonthSummary.totalIncome)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Outflow</div>
              <div className="text-slate-900 font-semibold">
                ${fromCents(activeMonthSummary.totalBills)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Net</div>
              <div
                className={
                  "font-semibold " +
                  (activeMonthSummary.net >= 0
                    ? "text-emerald-600"
                    : "text-rose-600")
                }
              >
                ${fromCents(activeMonthSummary.net)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Start-of-month balance</span>
            <span className="font-semibold text-slate-800">
              ${fromCents(startBalanceCents)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {mode === "actual"
                ? "Actual balance (from accounts)"
                : "Projected end-of-month"}
            </span>
            <span className="font-semibold text-slate-800">
              ${fromCents(endBalanceCents)}
            </span>
          </div>
        </section>
      )}

      {hasProjectionData && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-900">
              Weekly breakdown
            </div>
            <div className="text-[11px] text-slate-500">
              Based on{" "}
              {mode === "actual"
                ? "real income and expenses so far"
                : "your planned income, bills, and allocations"}
            </div>
          </div>

          {weeks.map((week) => (
            <div
              key={week.weekIndex}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Week {week.weekIndex + 1}
                  </span>
                  <span className="text-slate-600 text-[11px]">
                    Days {week.rangeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    {week.paidCount} paid
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {week.unpaidCount} unpaid
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-900 text-white rounded-2xl p-2 flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Income
                  </span>
                  <span className="mt-1 text-sm font-semibold">
                    ${fromCents(week.incomeCents)}
                  </span>
                </div>
                <div className="bg-rose-50 text-rose-900 rounded-2xl p-2 flex flex-col border border-rose-100">
                  <span className="text-[10px] uppercase tracking-wide text-rose-500">
                    Bills &amp; expenses
                  </span>
                  <span className="mt-1 text-sm font-semibold">
                    ${fromCents(week.billsCents)}
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-900 rounded-2xl p-2 flex flex-col border border-emerald-100">
                  <span className="text-[10px] uppercase tracking-wide text-emerald-500">
                    Net
                  </span>
                  <span className="mt-1 text-sm font-semibold">
                    ${fromCents(week.netCents)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-2 pt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Events this week</span>
                  {week.endBalances && (
                    <span className="flex items-center gap-1">
                      <span>End of week balance</span>
                      <span className="font-semibold text-slate-800">
                        $
                        {fromCents(
                          Object.values(week.endBalances || {}).reduce(
                            (acc, v) => acc + (v || 0),
                            0
                          )
                        )}
                      </span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {week.items
                    .slice()
                    .sort((a, b) => {
                      if (a.date < b.date) return -1;
                      if (a.date > b.date) return 1;
                      if (a.kind === "income" && b.kind !== "income")
                        return -1;
                      if (a.kind !== "income" && b.kind === "income")
                        return 1;
                      return 0;
                    })
                    .map((ev, idx) => {
                      const isExpense = ev.kind === "expense";
                      const billMeta =
                        ev.kind === "bill" && ev.billId
                          ? billById[ev.billId]
                          : null;
                      const label =
                        ev.kind === "income"
                          ? ev.description || "Income"
                          : ev.kind === "bill"
                          ? billMeta?.name || ev.billName || "Bill"
                          : ev.description || "Expense";

                      const day = new Date(
                        `${ev.date}T00:00:00`
                      ).getDate();

                      return (
                        <div
                          key={`${ev.date}-${ev.billId || idx}`}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 w-6 text-right">
                              {day}
                            </span>
                            <span
                              className={
                                "font-medium " +
                                (ev.isPaid
                                  ? "line-through text-slate-400"
                                  : isExpense
                                  ? "text-indigo-600"
                                  : "text-slate-800")
                              }
                            >
                              {label}
                            </span>
                          </div>
                          <span className="text-slate-800 font-semibold">
                            ${fromCents(Math.abs(ev.delta))}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
