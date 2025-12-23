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
import {
  projectCashflow,
  getMonthIndexFromStart,
  normalizeCashflowMode,
  DEFAULT_CASHFLOW_MODE,
} from "../lib/cashflow";
import {
  getScopedBillAmount,
  isBillVisibleInSelfScope,
} from "../lib/billSharing";

export default function Planner({
  cashflow: initialCashflow,
  months = 6,
  infographicProps,
}) {
  const { showToast } = useToast();
  const userProfile = useCashflowStore((state) => state.userProfile);
  const billSharing = useCashflowStore((state) => state.billSharing);

  // NEW: actual opening balance override (current month only)
  const actualOpeningBalanceCents = useCashflowStore(
    (state) => state.actualOpeningBalanceCents ?? null
  );
  const actualOpeningBalanceAsOfISO = useCashflowStore(
    (state) => state.actualOpeningBalanceAsOfISO ?? null
  );

  const role = userProfile?.role || "H";
  const mode =
    normalizeCashflowMode(infographicProps?.mode) || DEFAULT_CASHFLOW_MODE;

  // This page's top chart uses a scoped ("self") projection.
  const personScope = "self";

  // Align projection window to cover through the current month (at least 6 months).
  const startDateForWindow = infographicProps?.liveStartDate;
  const projectionMonths = useMemo(() => {
    const baseMinMonths = Math.max(6, months);
    if (!startDateForWindow) return baseMinMonths;
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthIndex = getMonthIndexFromStart(startDateForWindow, todayStr);
    return Math.max(6, monthIndex + 1);
  }, [startDateForWindow, months]);

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

    const todayISO = new Date().toISOString().slice(0, 10);

    const useActualOpening =
      mode === "actual" &&
      typeof actualOpeningBalanceCents === "number" &&
      Number.isFinite(actualOpeningBalanceCents) &&
      !!actualOpeningBalanceAsOfISO &&
      actualOpeningBalanceAsOfISO.slice(0, 7) === todayISO.slice(0, 7);

    const effectiveStartDate = useActualOpening
      ? actualOpeningBalanceAsOfISO
      : liveStartDate;

    // A. Filter Accounts (My Accounts Only)
    const myAccounts = liveAccounts.filter(
      (a) => a.ownerRole === role || a.ownerRole === "Joint" || !a.ownerRole
    );

    // Ensure engine always has at least one account
    const baseAccounts =
      myAccounts.length > 0
        ? myAccounts
        : [
            {
              id: "default",
              type: "checking",
              openingBalance: 0,
            },
          ];

    const safeResidualId =
      residualAccountId || baseAccounts[0]?.id || "default";

    // When using actual opening, seed total cash to the override and avoid double-counting
    const accountsForEngine = useActualOpening
      ? baseAccounts.map((a, idx) => ({
          ...a,
          openingBalance: idx === 0 ? actualOpeningBalanceCents / 100 : 0,
        }))
      : baseAccounts;

    // B. Filter Bills (My Share Only)
    const myBills = [];

    liveBills.forEach((b, idx) => {
      if (!isBillVisibleInSelfScope({ bill: b, role })) return;

      const scopedAmount = getScopedBillAmount({
        bill: b,
        role,
        billSharing,
      });

      myBills.push({
        ...b,
        id: b.id || `b${idx}`,
        amount: scopedAmount,
        accountId:
          b.accountId && accountsForEngine.some((a) => a.id === b.accountId)
            ? b.accountId
            : safeResidualId,
      });
    });

    // C. Filter Income (My Income Only)
    const myIncome = {
      husband: role === "H" ? liveIncome?.husband || 0 : 0,
      wife: role === "W" ? liveIncome?.wife || 0 : 0,
    };

    // D. Run Projection
    try {
      const projection = projectCashflow({
        startDate: effectiveStartDate,
        months: projectionMonths,
        accounts: accountsForEngine,
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
        mode,
      });

      return {
        ledger: projection.ledger,
        monthlySummary: projection.monthlySummary,
      };
    } catch (err) {
      console.warn("Planner local projection failed", err);
      return initialCashflow;
    }
  }, [
    initialCashflow,
    infographicProps,
    role,
    billSharing,
    projectionMonths,
    mode,
    actualOpeningBalanceCents,
    actualOpeningBalanceAsOfISO,
  ]);

  // 2. Build Timeline
  const timeline = useMemo(() => {
    const ledger = scopedCashflow?.ledger || [];
    const scopedLedger = ledger.filter(
      (entry) =>
        typeof entry.monthIndex !== "number" || entry.monthIndex < projectionMonths
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
  }, [scopedCashflow, projectionMonths]);

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
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);

  const lowestVariant = lowestBalance < 0 ? "highlight" : "elevated";
  const lowestIconColor =
    lowestBalance < 0 ? "text-danger-500" : "text-primary-600";
  const lowestBadge =
    lowestBalance < 0 ? (
      <Badge variant="danger">Risk</Badge>
    ) : (
      <Badge variant="success">Healthy</Badge>
    );

  const chartTitle = mode === "actual" ? "Actual Balance" : "Planned Balance";

  return (
    <div className="space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <h2 className="text-title-2xl font-bold tracking-tight text-surface-900">
            Financial Analysis
          </h2>
          <p className="text-caption text-surface-500">
            6 Month Plan ({role === "H" ? "Teles" : "Nicole"})
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
            <h3 className="text-title-l text-surface-900">{chartTitle}</h3>
            <p className="text-caption text-surface-500">
              Net worth forecast based on recurring bills &amp; income
              <br />
              <span className="text-surface-400 text-[11px]">
                Actual = realized income/expenses up to today; future bills still included.
              </span>
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
            variant="default"
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
                Planned vs actual view
              </p>
            </div>

            <MonthlyCashFlowInfographic
              {...infographicProps}
              role={role}
              personScope={personScope}
              lockedPersonScope={personScope}
              mode={mode}
            />
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
