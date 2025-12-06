import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';

// Hooks
import { useCashflowSummary } from '../hooks/useCashflowSummary';
import { useUpcomingBills } from '../hooks/useUpcomingBills';

// Components
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { CashflowChart } from '../components/charts/CashflowChart';
import { formatCurrency } from '../lib/cashflow/formatters';

export default function Home({ onGoToBills }) {
  
  // 1. Data Hooks (Connected to Global Store)
  const homeCashflowSummary = useCashflowSummary();
  const upcomingBillsFull = useUpcomingBills(14); // Look ahead 14 days

  // 2. Extract Summary Data
  const { income, expense, balance, projectedWeeks } = useMemo(() => {
    const projected = homeCashflowSummary?.projected || {};
    
    // Convert cents to dollars for display
    const inc = (projected.totalIncome || 0) / 100;
    const exp = (projected.totalBills || 0) / 100; 
    const net = (projected.net || 0) / 100;
    
    // Map weekly data for the chart
    const weeks = (projected.weeks || []).map((w, i) => ({
      label: `W${i + 1}`,
      balance: w.net / 100 
    }));

    return { income: inc, expense: exp, balance: net, projectedWeeks: weeks };
  }, [homeCashflowSummary]);

  // 3. Filter Upcoming Bills for Display (Limit to 3)
  const displayBills = useMemo(() => {
    // Already sorted by useUpcomingBills, just slice
    return upcomingBillsFull.slice(0, 3);
  }, [upcomingBillsFull]);

  return (
    <div className="space-y-6">
      
      {/* --- Hero Section: Balance --- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-caption font-semibold text-surface-500 uppercase tracking-wider">
            Projected Cash Flow
          </h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-900 tracking-tight">
              {formatCurrency(balance)}
            </span>
            <span className={`text-tiny font-bold px-2 py-1 rounded-full ${balance >= 0 ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/10 text-danger-500'}`}>
              {balance >= 0 ? '+On Track' : 'Over Budget'}
            </span>
          </div>
          <p className="text-caption text-surface-400 mt-1">
            Estimated for this month
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            title="Income" 
            value={formatCurrency(income)} 
            icon={<TrendingUp size={18} className="text-success-500" />}
            variant="default"
          />
          <StatCard 
            title="Expenses" 
            value={formatCurrency(expense)} 
            icon={<TrendingDown size={18} className="text-danger-500" />}
            variant="default"
          />
        </div>
      </section>

      {/* --- Chart Section --- */}
      <section>
        <Card>
          <CardHeader 
            title="Trend" 
            subtitle="Weekly Net Flow" 
          />
          <CardBody className="pt-0">
            <CashflowChart data={projectedWeeks} />
          </CardBody>
        </Card>
      </section>

      {/* --- Upcoming Bills Section --- */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-title-l font-bold text-surface-900">Upcoming Bills</h3>
          <button 
            onClick={onGoToBills}
            className="text-caption font-semibold text-primary-600 flex items-center gap-1 hover:text-primary-700"
          >
            See all <ArrowRight size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {displayBills.length > 0 ? (
            displayBills.map(bill => (
              <Card key={bill.id} className="flex items-center justify-between p-4 shadow-sm border-none bg-white">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${bill.status === 'overdue' ? 'bg-danger-50 text-danger-500' : 'bg-surface-100 text-surface-500'}`}>
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="text-body font-bold text-surface-900">{bill.name}</p>
                    <p className={`text-tiny font-medium ${bill.status === 'overdue' ? 'text-danger-500' : 'text-surface-500'}`}>
                      {bill.status === 'overdue' ? 'Overdue' : `Due ${new Date(bill.nextDueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}`}
                    </p>
                  </div>
                </div>
                <span className="text-body font-bold text-surface-900">
                  {formatCurrency(bill.amount)}
                </span>
              </Card>
            ))
          ) : (
            <div className="p-6 text-center bg-surface-50 rounded-3xl border border-surface-100 border-dashed">
              <p className="text-caption text-surface-400">No upcoming bills found.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}