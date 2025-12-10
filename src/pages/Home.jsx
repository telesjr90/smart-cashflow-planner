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
  isLoading,
}) {
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24 px-4 pt-6">
      {/* --- Header --- */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Smart Cash Flow Planner
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Overview of your projected and actual cash flow.
        </p>
      </header>

      {/* --- Hero Section: Balance --- */}
      <section className="space-y-4 mb-6">
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Projected Cash Flow
          </h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(balance)}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                balance >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {balance >= 0 ? "+ On Track" : "Over Budget"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Estimated for this month
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Income"
            value={formatCurrency(income)}
            icon={<TrendingUp size={18} className="text-emerald-500" />}
            variant="default"
          />
          <StatCard
            title="Expenses"
            value={formatCurrency(expense)}
            icon={<TrendingDown size={18} className="text-rose-500" />}
            variant="subtle"
          />
        </div>
      </section>

      {/* --- Chart Section --- */}
      <section className="mb-6">
        <Card className="rounded-3xl border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Weekly Cash Balance
                </h3>
                <p className="text-xs text-slate-400">
                  Based on your projected income and bills
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <CashflowChart data={chartData} />
          </CardBody>
        </Card>
      </section>

      {/* --- Upcoming Bills Section --- */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-lg font-bold text-slate-900">Upcoming Bills</h3>
          <button
            onClick={onGoToBills}
            className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
          >
            See all <ArrowRight size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {upcomingBills.length > 0 ? (
            upcomingBills.map((bill) => (
              <Card
                key={`${bill.id}-${bill.dueDate}`}
                className="rounded-3xl flex items-center justify-between p-4 shadow-sm border-none bg-white"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                      bill.overdue
                        ? "bg-rose-50 text-rose-500"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {bill.name}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        bill.overdue ? "text-rose-500" : "text-slate-500"
                      }`}
                    >
                      {bill.overdue
                        ? "Overdue"
                        : `Due ${formatDateShort(bill.dueDate)}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency((bill.amountCents || bill.amount || 0) / 100)}
                  </p>
                  {bill.paid && (
                    <p className="text-[10px] text-emerald-500 font-medium">
                      Paid
                    </p>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
              <p className="text-xs text-slate-400">
                No upcoming bills for this month.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <button
        onClick={onAddExpense}
        className="fixed bottom-24 right-4 h-14 w-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-40"
        aria-label="Add Transaction"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
