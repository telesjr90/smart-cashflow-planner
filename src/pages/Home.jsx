import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Plus } from "lucide-react";

// Hooks & Logic
import { selectUpcomingBills } from "../store/selectors/billsSelectors";
import { formatCurrency } from "../lib/cashflow/formatters";
import { formatDateShort } from "../utils/dateFormat";

// Components
import { StatCard } from "../components/ui/StatCard";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { CashflowChart } from "../components/charts/CashflowChart";
import DashboardSkeleton from "../components/ui/skeleton/DashboardSkeleton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/toast/useToast";

const getMonthIndexFromStart = (startDate, dateStr) => {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
};

export default function Home({
  cashflow,
  bills = [],
  paidBills = {},
  startDate,
  onGoToBills,
  onAddExpense,
  onGoToExpenses,
  isLoading,
}) {
  const { showToast } = useToast();
  // 1. Compute upcoming bills using a memo + pure selector
  const upcomingBills = useMemo(() => {
    return selectUpcomingBills(
      {
        bills,
        paidBills,
        startDate,
      },
      5 // limit
    );
  }, [bills, paidBills, startDate]);

  // 2. Derive summary from provided projection (already memoized upstream)
  const cashflowSummary = useMemo(() => {
    if (!cashflow) return { income: 0, expense: 0, balance: 0, chartData: [] };

    const todayStr = new Date().toISOString().slice(0, 10);
    const monthIndex = getMonthIndexFromStart(startDate, todayStr);
    const summary = cashflow.monthlySummary?.[monthIndex] || { totalIncome: 0, totalBills: 0, net: 0 };

    const chartData = (cashflow.monthlySummary || [])
      .slice(0, 6)
      .map((m, i) => ({
        label: `M${i + 1}`,
        balance: (m.net || 0) / 100,
      }));

    return {
      income: summary.totalIncome / 100,
      expense: summary.totalBills / 100,
      balance: summary.net / 100,
      chartData,
    };
  }, [cashflow, startDate]);

  const { income, expense, balance, chartData } = cashflowSummary;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const balanceStatus = balance >= 0 ? "positive" : "negative";

  return (
    <div className="min-h-screen bg-surface-50">
      <main className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8 pb-28 space-y-6">
        {/* --- Header --- */}
        <header className="space-y-1">
          <h1 className="text-title-2xl font-bold tracking-tight text-surface-900">Smart Cash Flow Planner</h1>
          <p className="text-caption text-surface-500">Overview of your projected and actual cash flow.</p>
        </header>

        {/* --- Hero Section: Balance --- */}
        <Card variant="elevated">
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-caption font-semibold uppercase tracking-wide text-surface-500">Projected Cash Flow</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-title-xl font-semibold text-surface-900 tracking-tight">
                  {formatCurrency(balance)}
                </span>
                <Badge variant={balanceStatus === "positive" ? "success" : "danger"}>
                  {balanceStatus === "positive" ? "On Track" : "Over Budget"}
                </Badge>
              </div>
              <p className="text-caption text-surface-500">Estimated for this month</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Income"
                value={formatCurrency(income)}
                icon={<TrendingUp size={18} className="text-success-500" />}
                variant="default"
                size="sm"
              />
              <StatCard
                title="Expenses"
                value={formatCurrency(expense)}
                icon={<TrendingDown size={18} className="text-danger-500" />}
                variant="highlight"
                size="sm"
              />
            </div>
          </CardBody>
        </Card>

        {/* --- Chart Section --- */}
        <Card variant="elevated">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-title-l text-surface-900">Weekly Cash Balance</h3>
                <p className="text-caption text-surface-500">Based on your projected income and bills</p>
              </div>
              {typeof onGoToExpenses === "function" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGoToExpenses?.()}
                >
                  View expenses <ArrowRight size={14} aria-hidden="true" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <CashflowChart data={chartData} />
          </CardBody>
        </Card>

        {/* --- Upcoming Bills Section --- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-title-l font-semibold text-surface-900">Upcoming Bills</h3>
            <Button variant="link" size="sm" onClick={onGoToBills}>
              See all <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </div>

          <div className="space-y-2">
            {upcomingBills.length > 0 ? (
              upcomingBills.map((bill) => (
                <Card key={`${bill.id}-${bill.dueDate}`} variant="flat">
                  <CardBody className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                          bill.overdue ? "bg-danger-500/10 text-danger-500" : "bg-surface-100 text-surface-600"
                        }`}
                      >
                        <Wallet size={20} aria-hidden="true" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-body font-semibold text-surface-900">{bill.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-caption ${bill.overdue ? "text-danger-500" : "text-surface-500"}`}>
                            {bill.overdue ? "Overdue" : `Due ${formatDateShort(bill.dueDate)}`}
                          </span>
                          {bill.paid && (
                            <Badge variant="success" className="px-2 py-0.5 text-tiny">
                              Paid
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <p className="text-body font-semibold text-surface-900">
                        {formatCurrency((bill.amountCents || bill.amount || 0) / 100)}
                      </p>
                      {bill.overdue && (
                        <span className="text-tiny text-danger-500 font-semibold">Attention needed</span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))
            ) : (
              <Card variant="flat">
                <CardBody className="text-center bg-surface-50 rounded-3xl border border-dashed border-surface-200 text-caption text-surface-500">
                  No upcoming bills for this month.
                </CardBody>
              </Card>
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <Button
        onClick={() => {
          if (typeof onAddExpense === "function") {
            onAddExpense();
          } else {
            showToast({ type: "info", message: "Add transaction coming soon." });
          }
        }}
        variant="primary"
        size="lg"
        className="fixed right-4 bottom-24 sm:bottom-[calc(24px+env(safe-area-inset-bottom))] h-14 w-14 rounded-pill shadow-soft hover:shadow-glow transition-all hover:scale-105 active:scale-95"
        aria-label="Add Transaction"
      >
        <Plus size={24} aria-hidden="true" />
      </Button>
    </div>
  );
}
