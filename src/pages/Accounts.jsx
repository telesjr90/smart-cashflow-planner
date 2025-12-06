import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Wallet,
  PiggyBank,
  ListChecks,
  Target,
  Receipt,
  ArrowRightLeft,
  Info,
} from "lucide-react";

// Hooks
import { useCashflowStore } from "../store/useCashflowStore";
import useCashflowData from "../hooks/useCashflowData";

// Lib
import { projectCashflow, fromCents, formatCurrency } from "../lib/cashflow/index.js";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Accounts({
  // Keep navigation callbacks as props since routing is handled by parent
  onGoToSettingsBudgets,
  onGoToSettingsGoals,
}) {
  // 1. Fetch Data from Store
  const accounts = useCashflowStore((state) => state.accounts);
  const residualAccountId = useCashflowStore((state) => state.residualAccountId);
  const income = useCashflowStore((state) => state.income);
  const paySchedule = useCashflowStore((state) => state.paySchedule);
  const bills = useCashflowStore((state) => state.bills);
  const expenses = useCashflowStore((state) => state.expenses);
  const goals = useCashflowStore((state) => state.goals);
  const categoryBudgets = useCashflowStore((state) => state.categoryBudgets);
  const startDate = useCashflowStore((state) => state.startDate);
  const paidBills = useCashflowStore((state) => state.paidBills);
  const allocationRules = useCashflowStore((state) => state.allocationRules);

  // 2. Fetch Actions
  const { handleUpdateAccounts } = useCashflowData();

  const safeAccounts = accounts || [];
  const [selectedId, setSelectedId] = useState(safeAccounts[0]?.id || null);

  // Keep selection valid when accounts change
  useEffect(() => {
    if (!safeAccounts.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !safeAccounts.find((a) => a.id === selectedId)) {
      setSelectedId(safeAccounts[0].id);
    }
  }, [safeAccounts, selectedId]);

  const selected = safeAccounts.find((a) => a.id === selectedId) || null;
  const incomeSafe = income || {};
  const payScheduleSafe = paySchedule || {};
  const rulesSafe = allocationRules || [];
  const startDateSafe = startDate && startDate.length >= 10 ? startDate : "2025-01-01";

  // Compute projected balances per account via cashflow engine
  const engineBalances = useMemo(() => {
    if (!safeAccounts.length) return {};

    try {
      const { finalBalancesByAccount } = projectCashflow({
        startDate: startDateSafe,
        months: 6, // project 6 months ahead
        accounts: safeAccounts,
        bills: bills || [],
        income: incomeSafe,
        paySchedule: payScheduleSafe,
        allocationRules: rulesSafe,
        residualAccountId,
        paidBills,
      });

      const out = {};
      Object.entries(finalBalancesByAccount || {}).forEach(
        ([id, cents]) => {
          out[id] = Number(fromCents(cents));
        }
      );
      return out;
    } catch (e) {
      console.warn("Accounts: engine balances failed", e);
      return {};
    }
  }, [
    startDateSafe,
    safeAccounts,
    bills,
    incomeSafe,
    payScheduleSafe,
    rulesSafe,
    residualAccountId,
    paidBills,
  ]);

  // Use engine balances
  const balanceMap = engineBalances;

  // --- helpers to persist changes ---

  const handleNameChange = useCallback(
    (id, newName) => {
      const next = safeAccounts.map((a) =>
        a.id === id ? { ...a, name: newName } : a
      );
      // Pass the existing residual ID to ensure it isn't lost
      handleUpdateAccounts(next, residualAccountId);
    },
    [safeAccounts, residualAccountId, handleUpdateAccounts]
  );

  const handleSetResidual = useCallback(
    (id) => {
      // accounts unchanged, only residual id moves
      handleUpdateAccounts(safeAccounts, id);
    },
    [safeAccounts, handleUpdateAccounts]
  );

  // --- derived "attachments" for the selected account ---

  const attached = useMemo(() => {
    if (!selected) {
      return { bills: [], expenses: [], goals: [], budgets: [] };
    }

    const selId = selected.id;

    const isForAccount = (itemAccountId) => {
      if (itemAccountId === selId) return true;
      // If item has no explicit account, treat it as residual account
      if (!itemAccountId && selId === residualAccountId) return true;
      return false;
    };

    const billsArr = (bills || []).filter((b) => isForAccount(b.accountId));
    const expensesArr = (expenses || []).filter((e) => isForAccount(e.accountId));
    const goalsArr = (goals || []).filter((g) => isForAccount(g.accountId));

    const budgetsArr = Object.entries(categoryBudgets || {}).map(
      ([category, cfg]) => ({
        category,
        amount: cfg?.amount ?? 0,
      })
    );

    return {
      bills: billsArr,
      expenses: expensesArr,
      goals: goalsArr,
      budgets: budgetsArr,
    };
  }, [selected, residualAccountId, bills, expenses, goals, categoryBudgets]);

  // --- summary for the selected account ---

  const summary = useMemo(() => {
    if (!selected) {
      return {
        balance: 0,
        billTotal: 0,
        expenseTotal: 0,
        goalMonthly: 0,
        budgetMonthly: 0,
      };
    }

    const currentBalance = balanceMap[selected.id] ?? selected.openingBalance ?? 0;

    const billTotal = attached.bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const expenseTotal = attached.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const goalMonthly = attached.goals.reduce((sum, g) => sum + (g.perMonth || g.monthlyAmount || 0), 0);
    const budgetMonthly = attached.budgets.reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      balance: currentBalance,
      billTotal,
      expenseTotal,
      goalMonthly,
      budgetMonthly,
    };
  }, [selected, attached, balanceMap]);

  const payScheduleLabel = useMemo(() => {
    if (!payScheduleSafe?.type) return "Semi-monthly (default)";
    if (payScheduleSafe.type === "semi-monthly") {
      const d1 = payScheduleSafe.day1 ?? 15;
      const d2 = payScheduleSafe.day2 ?? "last";
      return `Semi-monthly: ${d1} & ${d2 === "last" ? "last day" : d2}`;
    }
    return payScheduleSafe.type;
  }, [payScheduleSafe]);

  const totalMonthlyIncome = (incomeSafe.husband || 0) + (incomeSafe.wife || 0);

  return (
    <main className="px-4 pb-24">
      <header className="mb-4">
        <div className="text-xs text-slate-500">Accounts</div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <Wallet className="text-indigo-600" size={18} />
            <h1 className="text-sm font-semibold text-slate-900">
              Bank accounts & cash flow
            </h1>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Tap an account to see its bills, budgets, expenses, goals, and basic
          cash-flow impact.
        </p>
      </header>

      {/* layout: list on left, detail on right (stacked on mobile) */}
      <section className="flex flex-col gap-3">
        {/* Accounts list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="text-indigo-500" size={16} />
              <div className="text-xs font-semibold text-slate-700">
                Accounts ({safeAccounts.length})
              </div>
            </div>
          </div>

          {safeAccounts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-center text-xs text-slate-500">
              <div>You haven’t added any accounts yet.</div>
              <button
                type="button"
                onClick={() => {
                  const newId = `acct-${Date.now()}`;
                  const newAccount = {
                    id: newId,
                    name: "New account",
                    type: "deposit",
                    openingBalance: 0,
                  };
                  handleUpdateAccounts([newAccount], newId);
                }}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white px-3 py-1 mt-1"
              >
                Add your first account
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {safeAccounts.map((acc) => {
                const active = acc.id === selectedId;
                const isResidual = acc.id === residualAccountId;
                const bal = balanceMap[acc.id] ?? acc.openingBalance ?? 0;

                return (
                  <div
                    key={acc.id}
                    className={classNames(
                      "flex items-center gap-2 rounded-xl px-2 py-2 border cursor-pointer",
                      active
                        ? "border-indigo-500 bg-indigo-50/60"
                        : "border-slate-100 hover:bg-slate-50"
                    )}
                    onClick={() => setSelectedId(acc.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <input
                          className={classNames(
                            "text-xs font-semibold bg-transparent border-none outline-none p-0 m-0",
                            active ? "text-slate-900" : "text-slate-800"
                          )}
                          value={acc.name || ""}
                          onChange={(e) => handleNameChange(acc.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {isResidual && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-700 px-1.5 py-0.5">
                            Residual
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Type: {acc.type || "deposit"} · Balance:{" "}
                        {formatCurrency(bal)}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                        <input
                          type="radio"
                          name="residual-account"
                          className="h-3 w-3"
                          checked={isResidual}
                          onChange={() => handleSetResidual(acc.id)}
                        />
                        residual
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
          {!selected ? (
            <div className="text-xs text-slate-500">
              Select an account to see its details.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Wallet className="text-indigo-500" size={14} />
                    <div className="text-xs font-semibold text-slate-900">
                      {selected.name || "Unnamed account"}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Type: {selected.type || "deposit"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ID: {selected.id}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">
                    Projected balance
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCurrency(summary.balance)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                    <Info size={10} />
                    <span>Based on bills, budgets, goals & rules.</span>
                  </div>
                </div>
              </div>

              {/* Quick summary tiles */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500 mb-0.5">
                    Monthly bills
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    {formatCurrency(summary.billTotal)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500 mb-0.5">
                    Tracked expenses
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    {formatCurrency(summary.expenseTotal)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500 mb-0.5">
                    Goals / month
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    {formatCurrency(summary.goalMonthly)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500 mb-0.5">
                    Budgets / month
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    {formatCurrency(summary.budgetMonthly)}
                  </div>
                </div>
              </div>

              {/* Household & rules context */}
              <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <ArrowRightLeft size={12} className="text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500">
                      Household income:{" "}
                      <span className="font-semibold">
                        {formatCurrency(totalMonthlyIncome)}
                      </span>{" "}
                      · Pay schedule: {payScheduleLabel}
                    </div>
                    <div className="text-[10px] text-indigo-900/70 mt-0.5">
                      Allocation rules:{" "}
                      <span className="font-semibold">
                        {rulesSafe.length} rule
                        {rulesSafe.length === 1 ? "" : "s"}
                      </span>{" "}
                      across all accounts.
                    </div>
                  </div>
                </div>
              </div>

              {/* Attached items */}
              <div className="space-y-3">
                {/* Bills */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <ListChecks className="text-slate-500" size={14} />
                    <div className="text-[11px] font-semibold text-slate-700">
                      Bills ({attached.bills.length})
                    </div>
                  </div>
                  {attached.bills.length === 0 ? (
                    <div className="text-[10px] text-slate-500">
                      No bills linked to this account.
                    </div>
                  ) : (
                    <ul className="space-y-0.5">
                      {attached.bills.map((b) => (
                        <li
                          key={b.id}
                          className="flex justify-between text-[10px] text-slate-600"
                        >
                          <span className="truncate">
                            {b.name} · due day {b.dueDay}
                          </span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(b.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Budgets */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1">
                      <Receipt className="text-slate-500" size={14} />
                      <div className="text-[11px] font-semibold text-slate-700">
                        Budgets ({attached.budgets.length})
                      </div>
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
                  {attached.budgets.length === 0 ? (
                    <div className="text-[10px] text-slate-500">
                      No category budgets linked to this account.
                    </div>
                  ) : (
                    <ul className="space-y-0.5">
                      {attached.budgets.map((b) => (
                        <li
                          key={b.category}
                          className="flex justify-between text-[10px] text-slate-600"
                        >
                          <span className="truncate">{b.category}</span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(b.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Goals */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1">
                      <Target className="text-slate-500" size={14} />
                      <div className="text-[11px] font-semibold text-slate-700">
                        Goals ({attached.goals.length})
                      </div>
                    </div>
                    {typeof onGoToSettingsGoals === "function" && (
                      <button
                        type="button"
                        onClick={() => onGoToSettingsGoals()}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {attached.goals.length === 0 ? (
                    <div className="text-[10px] text-slate-500">
                      No goals linked to this account yet.
                    </div>
                  ) : (
                    <ul className="space-y-0.5">
                      {attached.goals.map((g) => (
                        <li
                          key={g.id}
                          className="flex justify-between text-[10px] text-slate-600"
                        >
                          <span className="truncate">{g.name}</span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(g.perMonth || 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Expenses */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <ArrowRightLeft className="text-slate-500" size={14} />
                    <div className="text-[11px] font-semibold text-slate-700">
                      Expenses ({attached.expenses.length})
                    </div>
                  </div>
                  {attached.expenses.length === 0 ? (
                    <div className="text-[10px] text-slate-500">
                      No tracked expenses for this account yet.
                    </div>
                  ) : (
                    <ul className="space-y-0.5">
                      {attached.expenses.map((e, idx) => (
                        <li
                          key={e.id || idx}
                          className="flex justify-between text-[10px] text-slate-600"
                        >
                          <span className="truncate">
                            {e.description || e.category || "Expense"}
                          </span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(e.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}