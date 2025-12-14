// src/pages/Accounts.jsx
import React, { useMemo } from "react";
import {
  Wallet,
  Receipt,
  Target,
  PieChart,
  CreditCard,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useCashflowStore } from "../store/useCashflowStore"; // Added store connection

// Helper to format currency
const fmt = (v) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(v || 0);

export default function Accounts({
  // Allow props to override store data (useful for testing/previews)
  accounts: propAccounts,
  bills: propBills,
  goals: propGoals,
  budgets: propBudgets,
  onAddAccount,
}) {
  // 1. Fetch data from store
  const storeAccounts = useCashflowStore((state) => state.accounts || []);
  const storeBills = useCashflowStore((state) => state.bills || []);
  const storeGoals = useCashflowStore((state) => state.goals || []);
  const categoryBudgets = useCashflowStore((state) => state.categoryBudgets || {});
  const userProfile = useCashflowStore((state) => state.userProfile);

  // 2. Normalize Budgets from object to array if coming from store
  const storeBudgets = useMemo(() => {
    return Object.values(categoryBudgets);
  }, [categoryBudgets]);

  // 3. Use props if provided, otherwise default to store data
  const accounts = propAccounts || storeAccounts;
  const bills = propBills || storeBills;
  const goals = propGoals || storeGoals;
  const budgets = propBudgets || storeBudgets;

  const role = userProfile?.role || "H"; // Default to Husband if unknown

  // 4. Filter Accounts (My Accounts Only)
  const myAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Show if I own it OR if it's Joint, or if it has no owner assigned
      return acc.ownerRole === role || acc.ownerRole === "Joint" || !acc.ownerRole;
    });
  }, [accounts, role]);

  // 5. Group items by account ID for easy rendering
  const groupedData = useMemo(() => {
    const map = {};

    // Initialize map for all known accounts
    myAccounts.forEach((acc) => {
      map[acc.id] = { bills: [], goals: [], budgets: [] };
    });

    // Distribute Bills
    bills.forEach((bill) => {
      if (bill.accountId && map[bill.accountId]) {
        map[bill.accountId].bills.push(bill);
      }
    });

    // Distribute Goals (checks accountId or linkedAccount)
    goals.forEach((goal) => {
      const accId = goal.accountId || goal.linkedAccount;
      if (accId && map[accId]) {
        map[accId].goals.push(goal);
      }
    });

    // Distribute Budgets
    budgets.forEach((budget) => {
      if (budget.accountId && map[budget.accountId]) {
        map[budget.accountId].budgets.push(budget);
      }
    });

    return map;
  }, [myAccounts, bills, goals, budgets]);

  if (!myAccounts.length) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-surface-400">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-title-m font-semibold text-surface-900">
            No Accounts Found
          </h3>
          <p className="text-body text-surface-500 max-w-sm mx-auto">
            Add an account to start tracking your bills, goals, and budgets.
          </p>
        </div>
        <Button variant="primary" icon={Wallet} onClick={onAddAccount}>
          Add First Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 px-4">
      {/* Page Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <h2 className="text-title-2xl font-bold tracking-tight text-surface-900">
            Accounts
          </h2>
          <p className="text-caption text-surface-500">
            Manage connected accounts and their linked items
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={onAddAccount}>
          Add Account
        </Button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 gap-6">
        {myAccounts.map((account) => {
          const data = groupedData[account.id] || { bills: [], goals: [], budgets: [] };

          const hasBills = data.bills.length > 0;
          const hasGoals = data.goals.length > 0;
          const hasBudgets = data.budgets.length > 0;
          const hasAnyLinks = hasBills || hasGoals || hasBudgets;

          const hasCurrentBalance = account.balance !== undefined && account.balance !== null;
          const hasOpeningBalance =
            account.openingBalance !== undefined && account.openingBalance !== null;

          // If account.balance is missing, don't label it as "Current Balance".
          const primaryBalanceValue = hasCurrentBalance
            ? account.balance
            : hasOpeningBalance
            ? account.openingBalance
            : 0;

          const primaryBalanceLabel = hasCurrentBalance
            ? "Current Balance"
            : "Opening Balance";

          return (
            <div
              key={account.id}
              className="bg-surface-100 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4"
            >
              {/* Account Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-200 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-surface-200 flex items-center justify-center text-surface-600 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-title-m font-semibold text-surface-900 truncate">
                      {account.name}
                    </h3>
                    <p className="text-caption text-surface-500 capitalize truncate">
                      {account.type}{" "}
                      <span className="text-surface-300">•</span>{" "}
                      {account.bankName || "Bank"}
                    </p>
                  </div>
                </div>

                <div className="text-left md:text-right bg-surface-50 md:bg-transparent p-3 md:p-0 rounded-xl border border-surface-200 md:border-0">
                  <div className="text-title-l font-bold text-surface-900">
                    {fmt(primaryBalanceValue)}
                  </div>
                  <div className="text-caption text-surface-500">
                    {primaryBalanceLabel}
                  </div>

                  {/* Option B: If both exist, show the secondary label/value compactly. */}
                  {hasCurrentBalance && hasOpeningBalance && (
                    <div className="mt-1 text-[11px] text-surface-500">
                      Opening:{" "}
                      <span className="font-semibold text-surface-700">
                        {fmt(account.openingBalance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Items Grid */}
              {hasAnyLinks ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Bills Column (keep even if empty via Section rules below) */}
                  <Section
                    title="Linked Bills"
                    icon={Receipt}
                    count={data.bills.length}
                    items={data.bills}
                    renderItem={(b) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-center py-2.5 text-sm border-b border-surface-200 last:border-0 hover:bg-surface-50 -mx-3 px-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-medium text-surface-900 truncate">
                            {b.name}
                          </div>
                          {b.dueDay && (
                            <div className="text-xs text-surface-400">
                              Due day {b.dueDay}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-surface-900 shrink-0">
                          {fmt(b.amount)}
                        </span>
                      </div>
                    )}
                  />

                  {/* Goals Column (hide when empty to avoid wasted space) */}
                  {hasGoals && (
                    <Section
                      title="Linked Goals"
                      icon={Target}
                      count={data.goals.length}
                      items={data.goals}
                      renderItem={(g) => (
                        <div
                          key={g.id}
                          className="flex justify-between items-center py-2.5 text-sm border-b border-surface-200 last:border-0 hover:bg-surface-50 -mx-3 px-3 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-medium text-surface-900 truncate">
                              {g.name}
                            </div>
                            <div className="text-xs text-surface-400 truncate">
                              Target: {fmt(g.targetAmount)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-semibold text-surface-900">
                              {fmt(g.currentAmount || 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    />
                  )}

                  {/* Budgets Column (hide when empty to avoid wasted space) */}
                  {hasBudgets && (
                    <Section
                      title="Linked Budgets"
                      icon={PieChart}
                      count={data.budgets.length}
                      items={data.budgets}
                      renderItem={(bg) => (
                        <div
                          key={bg.id}
                          className="flex justify-between items-center py-2.5 text-sm border-b border-surface-200 last:border-0 hover:bg-surface-50 -mx-3 px-3 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-medium text-surface-900 truncate">
                              {bg.category}
                            </div>
                            <div className="text-xs text-surface-400">Monthly Limit</div>
                          </div>
                          <span className="font-semibold text-surface-900 shrink-0">
                            {fmt(bg.limit)}
                          </span>
                        </div>
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-surface-400 bg-surface-50 rounded-xl p-3 border border-surface-200 border-dashed">
                  <AlertCircle className="w-4 h-4" />
                  <span>No bills, goals, or budgets are currently linked to this account.</span>
                </div>
              )}

              {/* If there are links but Goals/Budgets are empty and Bills is present,
                  we still render a balanced grid via only showing relevant columns above. */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Reusable Section Component
function Section({ title, icon: Icon, count, items, renderItem }) {
  if (count === 0)
    return (
      <div className="opacity-60 grayscale">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-surface-400" />
          <h4 className="text-sm font-semibold text-surface-500">{title}</h4>
          <Badge variant="neutral" size="sm">
            0
          </Badge>
        </div>
        <div className="bg-surface-50/50 border border-surface-100 rounded-xl px-4 py-8 text-center">
          <p className="text-xs text-surface-400">None assigned</p>
        </div>
      </div>
    );

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <Icon className="w-4 h-4 text-primary-600 shrink-0" />
        <h4 className="text-sm font-semibold text-surface-900 truncate">
          {title}
        </h4>
        <Badge variant="surface" size="sm" className="shrink-0">
          {count}
        </Badge>
      </div>

      {/* Use surface tokens to avoid bright islands inside tokenized containers */}
      <div className="bg-surface-50 border border-surface-200 rounded-xl px-3 py-1 shadow-soft">
        {items.map(renderItem)}
      </div>
    </div>
  );
}
