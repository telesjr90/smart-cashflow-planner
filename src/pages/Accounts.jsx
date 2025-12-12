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

// UI primitives
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

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
      Object.entries(finalBalancesByAccount || {}).forEach(([id, cents]) => {
        out[id] = Number(fromCents(cents));
      });
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
      const next = safeAccounts.map((a) => (a.id === id ? { ...a, name: newName } : a));
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

    const budgetsArr = Object.entries(categoryBudgets || {}).map(([category, cfg]) => ({
      category,
      amount: cfg?.amount ?? 0,
    }));

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
    <main className="px-4 pb-24 space-y-4">
      <header className="space-y-1.5 pt-2">
        <div className="text-tiny font-semibold uppercase tracking-wide text-surface-500">Accounts</div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
            <Wallet size={18} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-title-l text-surface-900">Bank accounts & cash flow</h1>
            <p className="text-caption text-surface-500">
              Tap an account to see its bills, budgets, expenses, goals, and basic cash-flow impact.
            </p>
          </div>
        </div>
      </header>

      {/* layout: list on left, detail on right (stacked on mobile) */}
      <section className="flex flex-col gap-3">
        {/* Accounts list */}
        <Card variant="flat">
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="text-primary-600" size={16} aria-hidden="true" />
                <div className="text-caption font-semibold text-surface-900">
                  Accounts ({safeAccounts.length})
                </div>
              </div>
            </div>

            {safeAccounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center text-caption text-surface-500">
                <div>You haven&apos;t added any accounts yet.</div>
                <Button
                  type="button"
                  size="sm"
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
                >
                  Add your first account
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {safeAccounts.map((acc) => {
                  const active = acc.id === selectedId;
                  const isResidual = acc.id === residualAccountId;
                  const bal = balanceMap[acc.id] ?? acc.openingBalance ?? 0;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      className={classNames(
                        "w-full rounded-2xl border text-left transition-all duration-150",
                        "flex items-center gap-3 px-3 py-2.5",
                        active
                          ? "border-primary-600 bg-primary-500/5 shadow-soft"
                          : "border-surface-200/60 bg-surface-50 hover:bg-surface-100"
                      )}
                      onClick={() => setSelectedId(acc.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            className={classNames(
                              "text-caption font-semibold bg-transparent border-none outline-none p-0 m-0 w-full min-w-0",
                              active ? "text-surface-900" : "text-surface-900"
                            )}
                            value={acc.name || ""}
                            onChange={(e) => handleNameChange(acc.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {isResidual && (
                            <Badge variant="primary" className="shrink-0">
                              Residual
                            </Badge>
                          )}
                        </div>
                        <div className="text-tiny text-surface-500 mt-0.5">
                          Type: {acc.type || "deposit"} · Balance: {formatCurrency(bal)}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 text-tiny text-surface-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name="residual-account"
                            className="h-3 w-3 accent-primary-600"
                            checked={isResidual}
                            onChange={() => handleSetResidual(acc.id)}
                          />
                          residual
                        </label>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Detail panel */}
        <Card variant="elevated">
          <CardBody className="space-y-4">
            {!selected ? (
              <div className="text-caption text-surface-500">Select an account to see its details.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1 rounded-pill bg-primary-500/10 px-2 py-1 text-caption text-primary-600">
                      <Wallet className="text-primary-600" size={14} aria-hidden="true" />
                      <span className="font-semibold">{selected.name || "Unnamed account"}</span>
                    </div>
                    <div className="text-caption text-surface-500">
                      Type: {selected.type || "deposit"}
                    </div>
                    <div className="text-tiny text-surface-400">ID: {selected.id}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-caption text-surface-500">Projected balance</div>
                    <div className="text-title-l font-semibold text-surface-900">
                      {formatCurrency(summary.balance)}
                    </div>
                    <div className="text-tiny text-surface-500 inline-flex items-center gap-1">
                      <Info size={12} aria-hidden="true" />
                      <span>Based on bills, budgets, goals & rules.</span>
                    </div>
                  </div>
                </div>

                {/* Quick summary tiles */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Monthly bills", value: formatCurrency(summary.billTotal) },
                    { label: "Tracked expenses", value: formatCurrency(summary.expenseTotal) },
                    { label: "Goals / month", value: formatCurrency(summary.goalMonthly) },
                    { label: "Budgets / month", value: formatCurrency(summary.budgetMonthly) },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-surface-200/60 bg-surface-50 px-3 py-2 shadow-soft"
                    >
                      <div className="text-tiny text-surface-500 mb-1">{item.label}</div>
                      <div className="text-body font-semibold text-surface-900">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Household & rules context */}
                <div className="rounded-2xl border border-surface-200/60 bg-surface-50 px-3 py-2 shadow-soft">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <ArrowRightLeft size={14} className="text-surface-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-caption text-surface-500">
                        Household income:{" "}
                        <span className="font-semibold text-surface-900">
                          {formatCurrency(totalMonthlyIncome)}
                        </span>{" "}
                        · Pay schedule: {payScheduleLabel}
                      </div>
                      <div className="text-caption text-primary-600">
                        Allocation rules:{" "}
                        <span className="font-semibold text-surface-900">
                          {rulesSafe.length} rule{rulesSafe.length === 1 ? "" : "s"}
                        </span>{" "}
                        across all accounts.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached items */}
                <div className="space-y-3">
                  {/* Bills */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <ListChecks className="text-surface-500" size={14} aria-hidden="true" />
                      <div className="text-caption font-semibold text-surface-700">
                        Bills ({attached.bills.length})
                      </div>
                    </div>
                    {attached.bills.length === 0 ? (
                      <div className="text-tiny text-surface-500">No bills linked to this account.</div>
                    ) : (
                      <ul className="space-y-1">
                        {attached.bills.map((b) => (
                          <li key={b.id} className="flex justify-between text-caption text-surface-600">
                            <span className="truncate">
                              {b.name} · due day {b.dueDay}
                            </span>
                            <span className="ml-2 font-semibold text-surface-900">
                              {formatCurrency(b.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Budgets */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <Receipt className="text-surface-500" size={14} aria-hidden="true" />
                        <div className="text-caption font-semibold text-surface-700">
                          Budgets ({attached.budgets.length})
                        </div>
                      </div>
                      {typeof onGoToSettingsBudgets === "function" && (
                        <button
                          type="button"
                          onClick={() => onGoToSettingsBudgets()}
                          className="text-tiny font-semibold text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {attached.budgets.length === 0 ? (
                      <div className="text-tiny text-surface-500">No category budgets linked to this account.</div>
                    ) : (
                      <ul className="space-y-1">
                        {attached.budgets.map((b) => (
                          <li key={b.category} className="flex justify-between text-caption text-surface-600">
                            <span className="truncate">{b.category}</span>
                            <span className="ml-2 font-semibold text-surface-900">
                              {formatCurrency(b.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Goals */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <Target className="text-surface-500" size={14} aria-hidden="true" />
                        <div className="text-caption font-semibold text-surface-700">
                          Goals ({attached.goals.length})
                        </div>
                      </div>
                      {typeof onGoToSettingsGoals === "function" && (
                        <button
                          type="button"
                          onClick={() => onGoToSettingsGoals()}
                          className="text-tiny font-semibold text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {attached.goals.length === 0 ? (
                      <div className="text-tiny text-surface-500">No goals linked to this account yet.</div>
                    ) : (
                      <ul className="space-y-1">
                        {attached.goals.map((g) => (
                          <li key={g.id} className="flex justify-between text-caption text-surface-600">
                            <span className="truncate">{g.name}</span>
                            <span className="ml-2 font-semibold text-surface-900">
                              {formatCurrency(g.perMonth || 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Expenses */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <ArrowRightLeft className="text-surface-500" size={14} aria-hidden="true" />
                      <div className="text-caption font-semibold text-surface-700">
                        Expenses ({attached.expenses.length})
                      </div>
                    </div>
                    {attached.expenses.length === 0 ? (
                      <div className="text-tiny text-surface-500">No tracked expenses for this account yet.</div>
                    ) : (
                      <ul className="space-y-1">
                        {attached.expenses.map((e, idx) => (
                          <li key={e.id || idx} className="flex justify-between text-caption text-surface-600">
                            <span className="truncate">{e.description || e.category || "Expense"}</span>
                            <span className="ml-2 font-semibold text-surface-900">
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
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
