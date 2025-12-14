// src/pages/Planner.jsx
import React, { useMemo } from "react";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { formatDateShort } from "../utils/dateFormat";
import MonthlyCashFlowInfographic from "../MonthlyCashFlowInfographic";
import ErrorBoundary from "../components/ErrorBoundary";

// Components
import { Card, CardBody } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { CashflowChart } from "../components/charts/CashflowChart";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ui/toast/useToast";

// Logic & Store
import { useCashflowStore } from "../store/useCashflowStore";
import { projectCashflow } from "../lib/cashflow";

export default function Planner({
  cashflow: initialCashflow,
  months = 6,
  infographicProps,
}) {
  const { showToast } = useToast();
  const userProfile = useCashflowStore((state) => state.userProfile);
  const billSharing = useCashflowStore((state) => state.billSharing);

  const role = userProfile?.role || "H";

  // This page's top chart uses a scoped ("self") projection. The infographic below
  // should align to the same scope inputs (role + personScope) even if it computes
  // internally, to avoid drift between what users see in the chart vs the breakdown.
  const personScope = "self";

  // 1. Calculate Scoped Projection (My Bills Only)
  const scopedCashflow = useMemo(() => {
    if (!infographicProps || !infographicProps.liveBills) {
      return initialCashflow;
    }

    const {
      liveStartDate,
      liveAccounts = [],
      liveBills = [],
      liveIncome,
      liveExtraIncomes = [],
      livePaySchedule,
      liveAllocationRules = [],
      liveExpenses = [],
      residualAccountId,
    } = infographicProps;

    // A. Filter Accounts (My Accounts Only)
    const myAccounts = liveAccounts.filter(
      (a) => a.ownerRole === role || a.ownerRole === "Joint" || !a.ownerRole
    );

    const safeResidualId = residualAccountId || myAccounts[0]?.id || "default";

    // B. Filter Bills (My Share Only)
    const myBills = [];
    const hPercent = billSharing?.percentageSplit?.H ?? 0.5;
    const wPercent = billSharing?.percentageSplit?.W ?? 0.5;

    liveBills.forEach((b, idx) => {
      let amount = Number(b.amount || 0);
      let shouldInclude = false;

      if (b.payer === role) {
        shouldInclude = true; // I pay 100%
      } else if (b.payer === "Shared" || !b.payer || b.payer === "AUTO") {
        const myPercent = role === "H" ? hPercent : wPercent;
        amount = amount * myPercent;
        shouldInclude = true;
      }

      if (shouldInclude) {
        myBills.push({
          ...b,
          id: b.id || `b${idx}`,
          amount: amount,
          accountId:
            b.accountId && myAccounts.some((a) => a.id === b.accountId)
              ? b.accountId
              : safeResidualId,
        });
      }
    });

    // C. Filter Income (My Income Only)
    const myIncome = {
      husband: role === "H" ? liveIncome?.husband || 0 : 0,
      wife: role === "W" ? liveIncome?.wife || 0 : 0,
    };

    // D. Run Projection
    try {
      const projection = projectCashflow({
        startDate: liveStartDate,
        months: months + 1,
        accounts: myAccounts,
        bills: myBills,
        income: myIncome,
        extraIncomes: liveExtraIncomes,
        expenses: liveExpenses,
        paySchedule: livePaySchedule || {
          type: "semi-monthly",
          day1: 15,
          day2: "last",
        },
        allocationRules: liveAllocationRules,
        residualAccountId: safeResidualId,
        paidBills: infographicProps.paidBills || {},
        mode: infographicProps.mode || "projected",
      });

      return {
        ledger: projection.ledger,
        monthlySummary: projection.monthlySummary,
      };
    } catch (err) {
      console.warn("Planner local projection failed", err);
      return initialCashflow;
    }
  }, [initialCashflow, infographicProps, role, billSharing, months]);

  // 2. Build Timeline
  const timeline = useMemo(() => {
    const ledger = scopedCashflow?.ledger || [];
    const scopedLedger = ledger.filter(
      (entry) => typeof entry.monthIndex !== "number" || entry.monthIndex < months
    );
    const dailyMap = new Map();

    scopedLedger.forEach((entry) => {
      const totalBal = Object.values(entry.balances || {}).reduce(
        (sum, val) => sum + val,
        0
      );
      dailyMap.set(entry.date, totalBal);
    });

    return Array.from(dailyMap.keys())
      .sort()
      .map((date) => ({
        date,
        balance: (dailyMap.get(date) || 0) / 100,
        label: formatDateShort(date),
      }));
  }, [scopedCashflow, months]);

  // 3. Calculate Insight Metrics
  const { lowestBalance, highestBalance, runwayDays } = useMemo(() => {
    if (!timeline.length)
      return { lowestBalance: 0, highestBalance: 0, runwayDays: 0 };

    const balances = timeline.map((t) => t.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);

    const negativeIndex = balances.findIndex((b) => b < 0);
    const days = negativeIndex === -1 ? "> 6 Months" : `${negativeIndex} Days`;

    return { lowestBalance: min, highestBalance: max, runwayDays: days };
  }, [timeline]);

  const fmt = (v) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
      v
    );

  const lowestVariant = lowestBalance < 0 ? "highlight" : "elevated";
  const lowestIconColor =
    lowestBalance < 0 ? "text-danger-500" : "text-primary-600";
  const lowestBadge =
    lowestBalance < 0 ? (
      <Badge variant="danger">Risk</Badge>
    ) : (
      <Badge variant="success">Healthy</Badge>
    );

  return (
    <div className="space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <h2 className="text-title-2xl font-bold tracking-tight text-surface-900">
            Financial Analysis
          </h2>
          <p className="text-caption text-surface-500">
            6 Month Projection ({role === "H" ? "Teles" : "Nicole"})
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Calendar}
          onClick={() =>
            showToast({ type: "info", message: "Adjust range coming soon." })
          }
        >
          Adjust Range
        </Button>
      </div>

      {/* Main Chart */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-title-l text-surface-900">Projected Balance</h3>
            <p className="text-caption text-surface-500">
              Net worth forecast based on recurring bills &amp; income
            </p>
          </div>
        </div>
        <div className="h-64 w-full">
          <CashflowChart data={timeline} />
        </div>
      </div>

      {/* Insight Stats */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
            variant="default" // [!code highlight] FIXED: Passed as string literal
            size="md"
          />
        </div>
      </div>

      {/* Safety Net / Runway */}
      <Card variant="flat">
        <CardBody className="flex items-center justify-between rounded-3xl bg-primary-600 text-white">
          <div>
            <p className="text-caption font-medium text-primary-100 mb-1">
              Financial Runway
            </p>
            <h3 className="text-title-l font-semibold">{runwayDays}</h3>
            <p className="text-tiny text-primary-100 mt-1">
              Until balance hits $0.00
            </p>
            <div className="mt-2">{lowestBadge}</div>
          </div>
          <div className="h-12 w-12 bg-white/15 rounded-full flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
        </CardBody>
      </Card>

      {infographicProps && (
        <ErrorBoundary
          resetKey={`${infographicProps.uid || "planner"}-${
            infographicProps.liveStartDate || "start"
          }`}
        >
          <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-title-l text-surface-900">
                Cashflow Infographic
              </h3>
              <p className="text-caption text-surface-500">
                Projected vs actual view
              </p>
            </div>

            <MonthlyCashFlowInfographic
              {...infographicProps}
              role={role}
              personScope={personScope}
            />
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
