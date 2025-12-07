import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Plus } from "lucide-react";
import { useCashflowStore } from "../store/useCashflowStore";

// Hooks & Logic
import { useCashflowSummary } from "../hooks/useCashflowSummary";
import { selectUpcomingBills } from "../store/selectors/billsSelectors";
import { formatCurrency } from "../lib/cashflow/formatters";

// Components
import { StatCard } from "../components/ui/StatCard";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { CashflowChart } from "../components/charts/CashflowChart";
import DashboardSkeleton from "../components/ui/skeleton/DashboardSkeleton";

export default function Home({ onGoToBills, onAddExpense }) {
  // 1. Summary derived via stable hook
  const summary = useCashflowSummary();
  const isLoading = useCashflowStore((state) => state.loading);

  // 2. Select raw slices for bills (NO object-literal selector here)
  const bills = useCashflowStore((state) => state.bills || []);
  const paidBills = useCashflowStore((state) => state.paidBills || {});
  const startDate = useCashflowStore((state) => state.startDate);

  // 3. Compute upcoming bills using a memo + pure selector
  const upcomingBills = useMemo(() => {
    // billsSelectors expect a "state-like" object with bills, paidBills, startDate
    return selectUpcomingBills(
      {
        bills,
        paidBills,
        startDate,
      },
      5 // limit
    );
  }, [bills, paidBills, startDate]);

  // 4. Prepare view-level derived data from summary
  const { income, expense, balance, chartData } = useMemo(() => {
    const inc = (summary?.totalIncome || 0) / 100;
    const exp = (summary?.totalBills || 0) / 100;
    const net = (summary?.net || 0) / 100;

    const weeks = (summary?.weeks || []).map((w, i) => ({
      label: `W${i + 1}`,
      balance: (w.net || 0) / 100,
    }));

    return {
      income: inc,
      expense: exp,
      balance: net,
      chartData: weeks,
    };
  }, [summary]);

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
                        : `Due ${new Date(bill.dueDate).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}`}
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
