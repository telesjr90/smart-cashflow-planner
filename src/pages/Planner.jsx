import React, { useMemo } from 'react';
import { TrendingUp, Calendar, Target } from 'lucide-react';
import { formatDateShort } from '../utils/dateFormat';

// Components
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { CashflowChart } from '../components/charts/CashflowChart';
import { Button } from '../components/ui/Button';

export default function Planner({ cashflow, months = 6 }) {
  const timeline = useMemo(() => {
    const ledger = cashflow?.ledger || [];
    const scopedLedger = ledger.filter(
      (entry) => typeof entry.monthIndex !== "number" || entry.monthIndex < months
    );
    const dailyMap = new Map();

    scopedLedger.forEach((entry) => {
      const totalBal = Object.values(entry.balances || {}).reduce((sum, val) => sum + val, 0);
      dailyMap.set(entry.date, totalBal);
    });

    return Array.from(dailyMap.keys())
      .sort()
      .map((date) => ({
        date,
        balance: (dailyMap.get(date) || 0) / 100,
        label: formatDateShort(date),
      }));
  }, [cashflow, months]);

  // 1. Calculate Insight Metrics
  const { lowestBalance, highestBalance, runwayDays } = useMemo(() => {
    if (!timeline.length) return { lowestBalance: 0, highestBalance: 0, runwayDays: 0 };
    
    const balances = timeline.map(t => t.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    
    // Simple runway calc: count days until balance < 0
    const negativeIndex = balances.findIndex(b => b < 0);
    const days = negativeIndex === -1 ? '> 6 Months' : `${negativeIndex} Days`;

    return { lowestBalance: min, highestBalance: max, runwayDays: days };
  }, [timeline]);

  // Format currency helper
  const fmt = (v) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(v);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-l font-bold text-surface-900">Financial Analysis</h2>
          <p className="text-caption text-surface-500">6 Month Projection</p>
        </div>
        <Button variant="secondary" size="sm" icon={Calendar}>
          Adjust Range
        </Button>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader 
          title="Projected Balance" 
          subtitle="Net worth forecast based on recurring bills & income" 
        />
        <CardBody>
          <div className="h-64 w-full">
            <CashflowChart data={timeline} />
          </div>
        </CardBody>
      </Card>

      {/* Insight Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          title="Lowest Balance" 
          value={fmt(lowestBalance)} 
          icon={<TrendingUp className={lowestBalance < 0 ? "text-danger-500" : "text-primary-500"} />}
          variant={lowestBalance < 0 ? "danger" : "default"}
        />
        <StatCard 
          title="Peak Balance" 
          value={fmt(highestBalance)} 
          icon={<Target className="text-success-500" />}
        />
      </div>

      {/* Safety Net / Runway */}
      <Card className="bg-primary-900 text-white">
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-caption font-medium mb-1">Financial Runway</p>
            <h3 className="text-title-l font-bold">{runwayDays}</h3>
            <p className="text-tiny text-primary-200 mt-1">Until balance hits $0.00</p>
          </div>
          <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
        </CardBody>
      </Card>

    </div>
  );
}
