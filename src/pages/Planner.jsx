import React, { useMemo } from "react";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { formatDateShort } from "../utils/dateFormat";
import MonthlyCashFlowInfographic from "../MonthlyCashFlowInfographic";
import ErrorBoundary from "../components/ErrorBoundary";

// Components
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { CashflowChart } from "../components/charts/CashflowChart";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export default function Planner({ cashflow, months = 6, infographicProps }) {
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

  const lowestVariant = lowestBalance < 0 ? 'highlight' : 'elevated';
  const lowestIconColor = lowestBalance < 0 ? 'text-danger-500' : 'text-primary-600';
  const lowestBadge = lowestBalance < 0 ? (
    <Badge variant="danger">Risk</Badge>
  ) : (
    <Badge variant="success">Healthy</Badge>
  );

  return (
    <div className="space-y-6 pb-20 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-title-l font-semibold text-surface-900">Financial Analysis</h2>
          <p className="text-caption text-surface-500">6 Month Projection</p>
        </div>
        <Button variant="secondary" size="sm" icon={Calendar}>
          Adjust Range
        </Button>
      </div>

      {/* Main Chart */}
      <Card variant="elevated">
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
          icon={<TrendingUp className={lowestIconColor} />}
          variant={lowestVariant}
          size="md"
        />
        <StatCard
          title="Peak Balance"
          value={fmt(highestBalance)}
          icon={<Target className="text-success-500" />}
          variant="default"
          size="md"
        />
      </div>

      {/* Safety Net / Runway */}
      <Card variant="flat">
        <CardBody className="flex items-center justify-between rounded-3xl bg-primary-600 text-white">
          <div>
            <p className="text-caption font-medium text-primary-100 mb-1">Financial Runway</p>
            <h3 className="text-title-l font-semibold">{runwayDays}</h3>
            <p className="text-tiny text-primary-100 mt-1">Until balance hits $0.00</p>
            <div className="mt-2">{lowestBadge}</div>
          </div>
          <div className="h-12 w-12 bg-white/15 rounded-full flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
        </CardBody>
      </Card>
      {infographicProps && (
        <ErrorBoundary resetKey={`${infographicProps.uid || "planner"}-${infographicProps.liveStartDate || "start"}`}>
          <Card variant="elevated">
            <CardHeader title="Cashflow Infographic" subtitle="Projected vs actual view" />
            <CardBody className="p-0">
              <MonthlyCashFlowInfographic {...infographicProps} />
            </CardBody>
          </Card>
        </ErrorBoundary>
      )}
    </div>
  );
}
