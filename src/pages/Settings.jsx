// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Settings as SettingsIcon, ChevronRight } from "lucide-react";

// Hooks
import { useCashflowStore } from "../store/useCashflowStore";
import useCashflowData from "../hooks/useCashflowData";

// Components
import ProfileForm from "../components/settings/ProfileForm";
import AccountsForm from "../components/settings/AccountsForm";
import GoalsForm from "../components/settings/GoalsForm";
import BudgetsForm from "../components/settings/BudgetsForm";
import AllocationRulesForm from "../components/settings/AllocationRulesForm";
import IncomeScheduleForm from "../components/settings/IncomeScheduleForm";
import BillSharingForm from "../components/settings/BillSharingForm";
import StartingBalanceCard from "../components/settings/StartingBalanceCard";
import BalancesSummaryCard from "../components/settings/BalancesSummaryCard";
import { Card, CardBody } from "../components/ui/Card";

const DEFAULT_BUDGET_CATEGORIES = {
  housing: { label: "Housing", amount: 0 },
  groceries: { label: "Groceries", amount: 0 },
  transport: { label: "Transport", amount: 0 },
  diningOut: { label: "Dining / Takeout", amount: 0 },
  utilities: { label: "Utilities", amount: 0 },
  personal: { label: "Personal / Misc", amount: 0 },
};

export default function Settings({
  // Navigation props can remain if passed by router
  scrollToSection = null,
  onResetScrollHint = () => {},
  onDirtyChange,
  isOnline = true,
}) {
  const actionsDisabled = !isOnline;
  // 1. Fetch Data from Global Store
  const userProfile = useCashflowStore((state) => state.userProfile || {});
  const accounts = useCashflowStore((state) => state.accounts || []);
  const bills = useCashflowStore((state) => state.bills || []);
  const residualAccountId = useCashflowStore((state) => state.residualAccountId);
  const allocationRules = useCashflowStore((state) => state.allocationRules || []);
  const income = useCashflowStore((state) => state.income || { husband: 0, wife: 0 });
  const paySchedule = useCashflowStore((state) => state.paySchedule);
  const goals = useCashflowStore((state) => state.goals || []);
  const categoryBudgets = useCashflowStore((state) => state.categoryBudgets || {});
  const startingBalance = useCashflowStore((state) => state.startingBalance);
  const billSharing = useCashflowStore((state) => state.billSharing);

  // 2. Fetch Actions from Data Hook
  const {
    handleUpdateProfile,
    handleUpdateAccounts,
    handleUpdateBills,
    handleUpdateAllocationRules,
    handleUpdateIncomeAndPaySchedule,
    handleUpdateGoals,
    handleUpdateBudgets,
    handleUpdateStartingBalance,
    handleUpdateBillSharing,
  } = useCashflowData();

  // Helper: Formatting
  const formatMoney = (n) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);

  // Derive Balances for Summary Card (Sum of account opening balances)
  const balances = useMemo(() => {
    const total = accounts.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0);
    return { total, husband: 0, wife: 0 };
  }, [accounts]);

  // --- Local State Management ---

  // Starting Balance
  const [localStartingBalance, setLocalStartingBalance] = useState(startingBalance ?? 0);
  const [dirtyStartingBalance, setDirtyStartingBalance] = useState(false);

  useEffect(() => {
    setLocalStartingBalance(startingBalance ?? 0);
    setDirtyStartingBalance(false);
  }, [startingBalance]);

  const handleSaveStartingBalance = () => {
    handleUpdateStartingBalance(localStartingBalance === "" ? 0 : Number(localStartingBalance) || 0);
    setDirtyStartingBalance(false);
  };

  const handleStartingBalanceChange = (value) => {
    setLocalStartingBalance(value === "" ? "" : parseFloat(value));
    setDirtyStartingBalance(true);
  };

  // Profile / Household
  const localRole = userProfile.role || "H";
  const [localHouseholdId, setLocalHouseholdId] = useState(userProfile.householdId || "");
  const [localRoleState, setLocalRoleState] = useState(localRole);
  const [dirtyProfile, setDirtyProfile] = useState(false);

  useEffect(() => {
    setLocalHouseholdId(userProfile.householdId || "");
    setLocalRoleState(userProfile.role || "H");
  }, [userProfile]);

  const handleProfileChange = (field, value) => {
    if (field === "householdId") setLocalHouseholdId(value);
    if (field === "role") setLocalRoleState(value);
    setDirtyProfile(true);
  };

  const handleSaveProfile = () => {
    handleUpdateProfile({ householdId: localHouseholdId, role: localRoleState });
    setDirtyProfile(false);
  };

  // Accounts
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [localResidualId, setLocalResidualId] = useState(residualAccountId || null);
  const [dirtyAccounts, setDirtyAccounts] = useState(false);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    setLocalResidualId(residualAccountId);
  }, [residualAccountId]);

  const handleAccountChange = (id, updates) => {
    setLocalAccounts((prev) =>
      prev.map((acct) => (acct.id === id ? { ...acct, ...updates } : acct))
    );
    setDirtyAccounts(true);
  };

  const handleAddAccount = () => {
    const newId = `acct-${Date.now()}`;
    setLocalAccounts((prev) => [
      ...prev,
      {
        id: newId,
        name: "New account",
        type: "deposit",
        openingBalance: 0,
        ownerRole: localRole,
        ownerUid: userProfile.uid || null,
      },
    ]);
    setDirtyAccounts(true);
  };

  const handleDeleteAccount = (id) => {
    setLocalAccounts((prev) => prev.filter((a) => a.id !== id));
    setDirtyAccounts(true);
  };

  const handleSaveAccounts = () => {
    handleUpdateAccounts(localAccounts, localResidualId);
    setDirtyAccounts(false);
  };

  const handleResidualChange = (value) => {
    setLocalResidualId(value || null);
    setDirtyAccounts(true);
  };

  const handleBulkImport = ({ accounts: importedAccounts, bills: importedBills }) => {
    const existingAccounts = accounts || [];
    const existingBills = bills || [];

    const newAccounts = (importedAccounts || []).map((acc, idx) => ({
      ...acc,
      id: acc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (existingAccounts.length + idx + 1),
    }));
    const allAccounts = [...existingAccounts, ...newAccounts];
    const accountIdByName = new Map(allAccounts.map((a) => [a.name.toLowerCase(), a.id]));

    const newBills = (importedBills || []).map((b) => ({
      id: b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (b.dueDay || 1),
      name: b.name,
      amount: b.amount,
      dueDay: b.dueDay,
      payer: b.payer,
      category: b.category,
      accountId:
        (b.accountName && accountIdByName.get(b.accountName.toLowerCase())) ||
        residualAccountId ||
        allAccounts[0]?.id ||
        null,
    }));
    const allBills = [...existingBills, ...newBills];

    handleUpdateAccounts(allAccounts, localResidualId);
    handleUpdateBills(allBills);

    setLocalAccounts(allAccounts);
    setDirtyAccounts(false);
  };

  // Allocation Rules
  const [localRules, setLocalRules] = useState(allocationRules);
  const [dirtyRules, setDirtyRules] = useState(false);

  useEffect(() => {
    setLocalRules(allocationRules);
  }, [allocationRules]);

  const handleAddRule = () => {
    const defaultAccount = (localAccounts[0] && localAccounts[0].id) || localResidualId || "";
    setLocalRules((prev) => [
      ...prev,
      { id: `rule-${Date.now()}`, accountId: defaultAccount, type: "percent", value: 0, frequency: "each", label: "New rule" },
    ]);
    setDirtyRules(true);
  };

  const handleRuleChange = (id, updates) => {
    setLocalRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));
    setDirtyRules(true);
  };

  const handleDeleteRule = (id) => {
    setLocalRules((prev) => prev.filter((rule) => rule.id !== id));
    setDirtyRules(true);
  };

  const handleSaveRules = () => {
    handleUpdateAllocationRules(localRules);
    setDirtyRules(false);
  };

  // Income & Schedule
  const [localIncome, setLocalIncome] = useState(income);
  const [localSchedule, setLocalSchedule] = useState(paySchedule || { type: "semi-monthly", day1: 15, day2: "last" });
  const [dirtyIncomeSchedule, setDirtyIncomeSchedule] = useState(false);

  useEffect(() => {
    setLocalIncome(income);
  }, [income]);

  useEffect(() => {
    if (paySchedule) setLocalSchedule(paySchedule);
  }, [paySchedule]);

  const handleIncomeChange = (field, value) => {
    setLocalIncome((prev) => ({ ...prev, [field]: value === "" ? "" : parseFloat(value) }));
    setDirtyIncomeSchedule(true);
  };

  const handleScheduleChange = (field, value) => {
    setLocalSchedule((prev) => ({ ...prev, [field]: value }));
    setDirtyIncomeSchedule(true);
  };

  const handleSaveIncomeSchedule = () => {
    const cleanedIncome = {
      husband: Number(localIncome.husband) || 0,
      wife: Number(localIncome.wife) || 0,
    };
    const cleanedSchedule = {
      ...localSchedule,
      day1: Number(localSchedule.day1) || 15,
      day2: localSchedule.day2 === "last" ? "last" : Number(localSchedule.day2) || "last",
    };
    handleUpdateIncomeAndPaySchedule(cleanedIncome, cleanedSchedule);
    setDirtyIncomeSchedule(false);
  };

  // Goals
  const normalizeGoal = (goal, role) => ({
    scope: "personal",
    status: "active",
    pendingFor: null,
    createdBy: role,
    contributions: {},
    owner: role,
    startDate: "",
    endDate: "",
    accountId: null,
    ...goal,
  });

  const [localGoals, setLocalGoals] = useState(() => (goals || []).map((g) => normalizeGoal(g, localRoleState)));
  const [dirtyGoals, setDirtyGoals] = useState(false);

  useEffect(() => {
    setLocalGoals((goals || []).map((g) => normalizeGoal(g, localRoleState)));
  }, [goals, localRoleState]);

  const handleAddGoal = () => {
    const newGoal = normalizeGoal({
      id: `goal-${Date.now()}`,
      name: "New goal",
      targetAmount: 0,
      perMonth: 0,
      savedSoFar: 0,
    }, localRoleState);
    setLocalGoals((prev) => [...prev, newGoal]);
    setDirtyGoals(true);
  };

  const handleGoalChange = (id, updates) => {
    setLocalGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    setDirtyGoals(true);
  };

  const handleGoalScopeChange = (id, scope) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const updated = { ...goal, scope };
        if (scope === "personal") {
          updated.contributions = {};
          updated.owner = goal.owner || localRoleState;
        } else {
          updated.contributions = { H: 0, W: 0 };
          updated.owner = null;
        }
        return updated;
      })
    );
    setDirtyGoals(true);
  };

  const handleGoalContributionChange = (id, who, value) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const amt = parseFloat(value) || 0;
        const contributions = { ...(goal.contributions || {}), [who]: amt };
        const perMonth = (contributions.H || 0) + (contributions.W || 0);
        return { ...goal, contributions, perMonth };
      })
    );
    setDirtyGoals(true);
  };

  const handleGoalPerMonthChange = (id, value) => {
    setLocalGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, perMonth: parseFloat(value) || 0 } : g))
    );
    setDirtyGoals(true);
  };

  const handleGoalApproval = (id, action) => {
    setLocalGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: action === "accept" ? "active" : "rejected", pendingFor: null } : g))
    );
    setDirtyGoals(true);
  };

  const handleDeleteGoal = (id) => {
    setLocalGoals((prev) => prev.filter((g) => g.id !== id));
    setDirtyGoals(true);
  };

  const handleSaveGoals = () => {
    handleUpdateGoals(localGoals);
    setDirtyGoals(false);
  };

  const visibleGoals = useMemo(() => localGoals, [localGoals]);

  // Budgets
  const initialBudgets = useMemo(() => {
    return Object.keys(categoryBudgets || {}).length === 0 ? DEFAULT_BUDGET_CATEGORIES : categoryBudgets;
  }, [categoryBudgets]);

  const [localBudgets, setLocalBudgets] = useState(initialBudgets);
  const [dirtyBudgets, setDirtyBudgets] = useState(false);

  useEffect(() => {
    setLocalBudgets(Object.keys(categoryBudgets || {}).length === 0 ? DEFAULT_BUDGET_CATEGORIES : categoryBudgets);
  }, [categoryBudgets]);

  const handleAddBudgetCategory = () => {
    const newKey = `category-${Date.now()}`;
    setLocalBudgets((prev) => ({
      ...prev,
      [newKey]: { label: "New category", amount: 0, scope: "personal", owner: localRole },
    }));
    setDirtyBudgets(true);
  };

  const handleBudgetChange = (key, updates) => {
    setLocalBudgets((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }));
    setDirtyBudgets(true);
  };

  const handleDeleteBudget = (key) => {
    setLocalBudgets((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setDirtyBudgets(true);
  };

  const handleSaveBudgets = () => {
    handleUpdateBudgets(localBudgets);
    setDirtyBudgets(false);
  };

  const visibleBudgets = useMemo(() => {
    return Object.entries(localBudgets).map(([key, cfg]) => ({ key, ...cfg }));
  }, [localBudgets]);

  // Bill Sharing
  const committedBillSharingRef = useRef(billSharing);
  const [localBillSharing, setLocalBillSharing] = useState(
    billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] }
  );
  const [dirtyBillSharing, setDirtyBillSharing] = useState(false);

  useEffect(() => {
    committedBillSharingRef.current = billSharing;
    setLocalBillSharing(
      billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] }
    );
    setDirtyBillSharing(false);
  }, [billSharing]);

  const handleBillSharingModeChange = (mode) => {
    setLocalBillSharing((prev) => ({ ...prev, mode }));
    setDirtyBillSharing(true);
  };

  const handleBillSharingPercentageChange = (who, value) => {
    const val = Math.max(0, Math.min(100, Number(value) || 0));
    const hShare = who === "H" ? val : Math.max(0, 100 - val);
    const wShare = who === "W" ? val : Math.max(0, 100 - val);
    setLocalBillSharing((prev) => ({ ...prev, percentageSplit: { H: hShare / 100, W: wShare / 100 } }));
    setDirtyBillSharing(true);
  };

  const handleSaveBillSharing = () => {
    const next = {
      ...localBillSharing,
      sharedBillIds: localBillSharing.sharedBillIds || [],
    };
    handleUpdateBillSharing(next);
    setDirtyBillSharing(false);
  };

  // Scroll Hints
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    if (!scrollToSection) return;
    const lower = String(scrollToSection).toLowerCase();
    const keyMap = {
      goals: "goals",
      budgets: "budgets",
      profile: "profile",
      accounts: "accounts",
      allocations: "allocations",
      income: "income",
      "bill-sharing": "bill-sharing",
    };
    const targetKey = keyMap[lower];
    if (targetKey) {
      setActiveSection(targetKey);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      onResetScrollHint();
    }
  }, [scrollToSection, onResetScrollHint]);

  // Dirty State Prop
  useEffect(() => {
    if (onDirtyChange) {
      const isDirty =
        dirtyStartingBalance ||
        dirtyProfile ||
        dirtyAccounts ||
        dirtyRules ||
        dirtyIncomeSchedule ||
        dirtyGoals ||
        dirtyBudgets ||
        dirtyBillSharing;
      onDirtyChange(isDirty);
    }
  }, [
    dirtyStartingBalance,
    dirtyProfile,
    dirtyAccounts,
    dirtyRules,
    dirtyIncomeSchedule,
    dirtyGoals,
    dirtyBudgets,
    dirtyBillSharing,
    onDirtyChange,
  ]);

  return (
    <div className="min-h-svh bg-surface-50">
      <header className="px-6 md:px-8 lg:px-12 pt-6 pb-4 border-b border-surface-200 bg-surface-100">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
            <SettingsIcon size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="text-title-l font-semibold text-surface-900">Settings</div>
            <div className="text-caption text-surface-500">Manage your household, accounts, and goals</div>
          </div>
        </div>
      </header>

      {!isOnline && (
        <Card variant="flat" className="mx-6 md:mx-8 lg:mx-12 mt-3">
          <CardBody className="rounded-2xl border border-warning-500/40 bg-warning-500/10 text-caption text-warning-600">
            Offline mode: settings changes are disabled until you reconnect.
          </CardBody>
        </Card>
      )}

      <main
        className={`max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8 pb-24 space-y-6 ${
          actionsDisabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <nav className="space-y-2">
          {[
            { key: "profile", label: "Profile & Household" },
            { key: "accounts", label: "Accounts & Residual" },
            { key: "allocations", label: "Allocation Rules" },
            { key: "income", label: "Income & Pay Schedule" },
            { key: "bill-sharing", label: "Bill Sharing" },
            { key: "goals", label: "Goals" },
            { key: "budgets", label: "Budgets" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveSection(item.key);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-current={activeSection === item.key ? "page" : undefined}
              className="w-full flex items-center justify-between rounded-2xl bg-surface-50 border border-surface-200 px-4 py-3 text-body font-semibold text-surface-900 hover:bg-surface-100 transition-colors"
            >
              <span>{item.label}</span>
              <ChevronRight size={18} className="text-surface-400" aria-hidden="true" />
            </button>
          ))}
        </nav>

        {activeSection === "profile" && (
          <div>
            <ProfileForm
              uid={userProfile.uid}
              localHouseholdId={localHouseholdId}
              localRole={localRoleState}
              dirtyProfile={dirtyProfile}
              onProfileChange={handleProfileChange}
              onSaveProfile={handleSaveProfile}
            />
          </div>
        )}

        {activeSection === "accounts" && (
          <div className="space-y-6">
            <section>
              <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
                <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                  Starting Balance
                </h3>
                <StartingBalanceCard
                  startingBalance={localStartingBalance}
                  dirtyStartingBalance={dirtyStartingBalance}
                  onStartingBalanceChange={handleStartingBalanceChange}
                  onSaveStartingBalance={handleSaveStartingBalance}
                />
              </div>
            </section>

            <section>
              <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
                <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                  Account Balances
                </h3>
                <BalancesSummaryCard
                  total={formatMoney(balances.total)}
                  husband={formatMoney(balances.husband)}
                  wife={formatMoney(balances.wife)}
                />
              </div>
            </section>

            <AccountsForm
              accounts={localAccounts}
              residualAccountId={localResidualId}
              dirtyAccounts={dirtyAccounts}
              onAddAccount={handleAddAccount}
              onAccountChange={handleAccountChange}
              onDeleteAccount={handleDeleteAccount}
              onResidualChange={handleResidualChange}
              onSaveAccounts={handleSaveAccounts}
              onBulkImport={handleBulkImport}
            />
          </div>
        )}

        {activeSection === "allocations" && (
          <section>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
              <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                Allocation Rules
              </h3>
              <AllocationRulesForm
                rules={localRules}
                accounts={localAccounts}
                dirtyRules={dirtyRules}
                onAddRule={handleAddRule}
                onRuleChange={handleRuleChange}
                onDeleteRule={handleDeleteRule}
                onSaveRules={handleSaveRules}
              />
            </div>
          </section>
        )}

        {activeSection === "income" && (
          <section>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
              <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                Income &amp; Pay Schedule
              </h3>
              <IncomeScheduleForm
                income={localIncome}
                schedule={localSchedule}
                dirtyIncomeSchedule={dirtyIncomeSchedule}
                onIncomeChange={handleIncomeChange}
                onScheduleChange={handleScheduleChange}
                onSaveIncomeSchedule={handleSaveIncomeSchedule}
              />
            </div>
          </section>
        )}

        {activeSection === "bill-sharing" && (
          <section>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
              <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                Bill Sharing
              </h3>
              <BillSharingForm
                billSharing={localBillSharing}
                dirtyBillSharing={dirtyBillSharing}
                onModeChange={handleBillSharingModeChange}
                onPercentageChange={handleBillSharingPercentageChange}
                onSave={handleSaveBillSharing}
              />
            </div>
          </section>
        )}

        {activeSection === "goals" && (
          <section>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
              <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                Goals
              </h3>
              <GoalsForm
                visibleGoals={visibleGoals}
                localRole={localRole}
                localAccounts={localAccounts}
                dirtyGoals={dirtyGoals}
                onAddGoal={handleAddGoal}
                onGoalChange={handleGoalChange}
                onGoalPerMonthChange={handleGoalPerMonthChange}
                onGoalScopeChange={handleGoalScopeChange}
                onGoalContributionChange={handleGoalContributionChange}
                onGoalApproval={handleGoalApproval}
                onDeleteGoal={handleDeleteGoal}
                onSaveGoals={handleSaveGoals}
              />
            </div>
          </section>
        )}

        {activeSection === "budgets" && (
          <section>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
              <h3 className="flex items-center justify-between gap-3 text-title-l font-semibold text-surface-900">
                Budgets
              </h3>
              <BudgetsForm
                visibleBudgets={visibleBudgets}
                localRole={localRole}
                localAccounts={localAccounts}
                dirtyBudgets={dirtyBudgets}
                onAddBudgetCategory={handleAddBudgetCategory}
                onBudgetChange={handleBudgetChange}
                onDeleteBudget={handleDeleteBudget}
                onSaveBudgets={handleSaveBudgets}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
