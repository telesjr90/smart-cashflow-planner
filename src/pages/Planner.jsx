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

function Pill({ children, className = "" }) {
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

  // ---------- Run the projection engine ----------
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
      const day = d.getDate();
      const weekIndex = Math.floor((day - 1) / 7);
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

  const combinedFinalBalance = useMemo(() => {
    const vals = Object.values(finalBalancesByAccount || {});
    if (!vals.length) return 0;
    return vals.reduce((acc, v) => acc + v, 0);
  }, [finalBalancesByAccount]);

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

      {!hasProjectionData && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-xs text-slate-600">
          <div className="font-semibold text-slate-900 mb-1">
            Planner not ready yet
          </div>
          <p>Add income, accounts, and bills in Settings and Bills to see your cash flow.</p>
        </section>
      )}

      {hasProjectionData && activeMonthSummary && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Wallet size={16} className="text-indigo-600" />
              <span>Monthly snapshot</span>
            </div>
            {/* Segmented control to toggle between Projected and Actual modes */}
            <Segmented
              value={mode}
              onChange={(val) => {
                if (typeof setMode === "function") setMode(val);
              }}
              options={[
                { value: "projected", label: "Projected" },
                { value: "actual", label: "Actual" },
              ]}
            />
          </div>

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
            <span>
              {mode === "actual" ? "Actual end-of-month" : "Projected end-of-month"}
            </span>
            <span className="font-semibold text-slate-800">
              ${fromCents(combinedFinalBalance)}
            </span>
          </div>
        </section>
      )}

      {hasProjectionData && (
        <section className="space-y-3">
          {weeks.map((w) => (
            <div
              key={w.weekIndex}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-800">
                  Week {w.weekIndex + 1}{" "}
                  <span className="text-slate-500">({w.rangeLabel})</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  {w.unpaidCount > 0 && (
                    <Pill className="bg-amber-50 text-amber-700">
                      {w.unpaidCount} upcoming
                    </Pill>
                  )}
                  {w.paidCount > 0 && (
                    <Pill className="bg-emerald-50 text-emerald-700">
                      {w.paidCount} paid
                    </Pill>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-slate-500 mb-0.5">Income</div>
                  <div className="text-slate-900 font-semibold">
                    ${fromCents(w.incomeCents)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Outflow</div>
                  <div className="text-slate-900 font-semibold">
                    ${fromCents(w.billsCents)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Net</div>
                  <div
                    className={
                      "font-semibold " +
                      (w.netCents >= 0 ? "text-emerald-600" : "text-rose-600")
                    }
                  >
                    ${fromCents(w.netCents)}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 mt-1 space-y-1">
                {w.items
                  .filter((ev) => ev.kind === "bill" || ev.kind === "expense")
                  .map((ev, idx) => {
                    const d = new Date(`${ev.date}T00:00:00`);
                    const day = d.getDate();
                    const billMeta = ev.billId ? billById[ev.billId] : null;
                    const label =
                      ev.description ||
                      ev.billName ||
                      billMeta?.name ||
                      "Item";
                    const isExpense = ev.kind === "expense";

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
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-semibold">
                            ${fromCents(Math.abs(ev.delta))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}