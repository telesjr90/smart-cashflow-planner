// src/pages/Home.jsx
import React, { useMemo } from "react";
import {
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Wallet,
  Calendar as CalendarIcon,
} from "lucide-react";

import { useCashflowStore } from "../store/useCashflowStore";
import { useCashflowTimeline } from "../hooks/useCashflowTimeline";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  getScopedBillAmount,
  isBillVisibleInSelfScope,
} from "../lib/billSharing";

// Components
// [!code highlight:2] FIXED: Named import required for build
import { CashflowChart } from "../components/charts/CashflowChart";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, monthIndexZeroBased) {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

function buildDueDateForCurrentMonth(dueDay, now = new Date()) {
  const y = now.getFullYear();
  const mIdx = now.getMonth();
  const dim = daysInMonth(y, mIdx);
  const safeDay = Math.min(Math.max(Number(dueDay || 1), 1), dim);
  return `${y}-${pad2(mIdx + 1)}-${pad2(safeDay)}`;
}

// Pure helper to compute "My Bills Due" given inputs and an optional clock.
export function computeBillsDueAmount({ bills = [], role = "H", billSharing, paidBills = {}, now = new Date() }) {
  const unpaidThisMonth = (bills || []).filter((b) => {
    const dueDate = buildDueDateForCurrentMonth(b.dueDay, now);
    const billId = b.id || "";
    if (!billId) return true;
    const key = `${dueDate}:${billId}`;
    const isPaid = !!paidBills?.[key];
    const visible = isBillVisibleInSelfScope({ bill: b, role });
    return !isPaid && visible;
  });

  return unpaidThisMonth.reduce((total, bill) => {
    const share = getScopedBillAmount({ bill, role, billSharing });
    return total + share;
  }, 0);
}

function normalizeMaybeCents(value, keyHint = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;

  // If the field name suggests cents, convert.
  if (/cents/i.test(String(keyHint))) return n / 100;

  // Heuristic: large integers are often cents. Avoid double converting decimals.
  if (Number.isInteger(n) && Math.abs(n) >= 10000) return n / 100;

  return n;
}

export default function Home({
  onGoToBills,
  onGoToPlanner,
  onGoToAccounts,
  onAddExpense,
}) {
  const userProfile = useCashflowStore((state) => state.userProfile);
  const startDate = useCashflowStore((state) => state.startDate);
  const accounts = useCashflowStore((state) => state.accounts || []);
  const bills = useCashflowStore((state) => state.bills || []);
  const billSharing = useCashflowStore((state) => state.billSharing);
  const paidBills = useCashflowStore((state) => state.paidBills || {});
  const hasHydrated = useCashflowStore((state) => state.hasHydrated);

  // Compute a dynamic months window so the chart always covers the current month.
  const monthsForHomeTimeline = useMemo(() => {
    if (!startDate) return 6;
    const today = new Date();
    const s = new Date(startDate + "T00:00:00");
    const monthIndex =
      (today.getFullYear() - s.getFullYear()) * 12 +
      (today.getMonth() - s.getMonth());
    return Math.max(6, monthIndex + 1);
  }, [startDate]);

  // Compute chart timeline directly (same engine as Planner) rather than guessing store keys.
  const chartData = useCashflowTimeline(monthsForHomeTimeline);

  // 1. Determine Current User Role
  const role = userProfile?.role || "H"; // Default to Husband if unknown
  const isHusband = role === "H";

  // 2. Filter Accounts (My Accounts Only)
  const myAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Show if I own it, if it's Joint, or if it has no owner assigned
      return acc.ownerRole === role || acc.ownerRole === "Joint" || !acc.ownerRole;
    });
  }, [accounts, role]);

  const hasComputedBalances = useMemo(() => {
    return myAccounts.some(
      (a) =>
        a?.currentBalance != null ||
        a?.balance != null ||
        a?.currentBalanceCents != null ||
        a?.balanceCents != null
    );
  }, [myAccounts]);

  const totalBalance = useMemo(() => {
    // Prefer computed/current balances if the store provides them; otherwise fall back to openingBalance.
    return myAccounts.reduce((sum, acc) => {
      const hasCurrent =
        acc?.currentBalance != null ||
        acc?.balance != null ||
        acc?.currentBalanceCents != null ||
        acc?.balanceCents != null;

      if (hasCurrent) {
        const raw =
          acc.currentBalance ??
          acc.balance ??
          acc.currentBalanceCents ??
          acc.balanceCents ??
          0;
        const keyHint =
          acc.currentBalanceCents != null || acc.balanceCents != null ? "cents" : "";
        return sum + normalizeMaybeCents(raw, keyHint);
      }

      return sum + (Number(acc.openingBalance) || 0);
    }, 0);
  }, [myAccounts]);

  const balanceLabel = hasComputedBalances ? "My Balance" : "Starting Balance";

  // 3. Calculate "My Bills Due"
  const billsDueAmount = useMemo(
    () =>
      computeBillsDueAmount({
        bills,
        role,
        billSharing,
        paidBills,
        now: new Date(),
      }),
    [bills, role, billSharing, paidBills]
  );

  // Formatters
  const formatMoney = (amount) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (!hasHydrated) {
    return null;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-title-l font-bold text-surface-900">
            {getGreeting()},{" "}
            {userProfile?.displayName || (isHusband ? "Teles" : "Nicole")}
          </h1>
          <p className="text-body text-surface-500">Here's your financial snapshot</p>
        </div>
        <a href="/settings" className="block">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
            {role}
          </div>
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary-600 text-white border-none shadow-primary-sm">
          <CardBody className="p-4 space-y-2">
            <div className="flex items-center gap-2 opacity-90">
              <Wallet size={18} />
              <span className="text-caption font-medium">{balanceLabel}</span>
            </div>
            <div className="text-title-l font-bold">{formatMoney(totalBalance)}</div>
          </CardBody>
        </Card>

        <Card className="bg-surface-50 border-surface-200 shadow-soft">
          <CardBody className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-surface-500">
              <AlertCircle size={18} className="text-warning-500" />
              <span className="text-caption font-medium">My Bills Due</span>
            </div>
            <div className="text-title-l font-bold text-surface-900">
              {formatMoney(billsDueAmount)}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div className="flex-none">
          <a
            href="/planner"
            onClick={(e) => {
              if (typeof onGoToPlanner === "function") {
                e.preventDefault();
                onGoToPlanner();
              }
            }}
          >
            <Button
              variant="outline"
              className="rounded-xl border-surface-200 bg-surface-50 shadow-soft hover:bg-surface-100"
            >
              <TrendingUp size={18} className="mr-2 text-green-600" />
              Forecast
            </Button>
          </a>
        </div>
        <div className="flex-none">
          <Button
            variant="outline"
            className="rounded-xl border-surface-200 bg-surface-50 shadow-soft hover:bg-surface-100"
            onClick={onGoToBills}
          >
            <CalendarIcon size={18} className="mr-2 text-primary-600" />
            Pay Bills
          </Button>
        </div>
        <div className="flex-none">
          <a
            href="/accounts"
            onClick={(e) => {
              if (typeof onGoToAccounts === "function") {
                e.preventDefault();
                onGoToAccounts();
              }
            }}
          >
            <Button
              variant="outline"
              className="rounded-xl border-surface-200 bg-surface-50 shadow-soft hover:bg-surface-100"
            >
              <Plus size={18} className="mr-2 text-surface-600" />
              Add Account
            </Button>
          </a>
        </div>
      </div>

      {/* Cashflow Chart Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-title-m font-bold text-surface-900">Cash Flow</h3>
          <a
            href="/planner"
            className="text-caption font-semibold text-primary-600 flex items-center"
          >
            View Report <ArrowRight size={14} className="ml-1" />
          </a>
        </div>

        <Card className="h-64 bg-surface-50 border-surface-200 shadow-soft overflow-hidden">
          <CardBody className="p-0 h-full">
            {chartData.length >= 2 ? (
              <CashflowChart data={chartData} />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[11px] text-surface-500 bg-surface-50">
                Not enough data to show cash flow yet. Add accounts, income, and bills
                to see a projection.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* My Accounts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-title-m font-bold text-surface-900">My Accounts</h3>
          <a href="/accounts" className="text-caption font-semibold text-primary-600">
            See All
          </a>
        </div>

        <div className="space-y-3">
          {myAccounts.length > 0 ? (
            myAccounts.map((account) => {
              const rawDisplay =
                account?.currentBalance ??
                account?.balance ??
                account?.currentBalanceCents ??
                account?.balanceCents ??
                account?.openingBalance ??
                0;

              const keyHint =
                account?.currentBalanceCents != null || account?.balanceCents != null
                  ? "cents"
                  : "";

              const displayAmount =
                account?.currentBalance != null ||
                account?.balance != null ||
                account?.currentBalanceCents != null ||
                account?.balanceCents != null
                  ? normalizeMaybeCents(rawDisplay, keyHint)
                  : Number(rawDisplay) || 0;

              return (
                <Card
                  key={account.id}
                  className="bg-surface-50 border-surface-200 shadow-soft hover:bg-surface-100 active:scale-[0.98] transition-transform"
                >
                  <CardBody className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-surface-900">{account.name}</p>
                      <p className="text-caption text-surface-500 capitalize">
                        {account.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-surface-900">
                        {formatMoney(displayAmount)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              );
            })
          ) : (
            <div className="p-6 text-center text-surface-400 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
              No accounts found for you.
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={onAddExpense}
        variant="primary"
        size="lg"
        className="fixed right-4 bottom-24 h-14 w-14 rounded-full shadow-lg flex items-center justify-center z-50"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
}
