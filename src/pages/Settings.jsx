// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Settings as SettingsIcon } from "lucide-react";

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

// Small card wrapper for consistent styling
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-surface-200 ${className}`}>
      {children}
    </div>
  );
}

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
    // Simple split estimation based on profile role ownership could go here, 
    // but for now we display global total to keep it simple.
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

    // Merge Accounts
    const newAccounts = (importedAccounts || []).map((acc, idx) => ({
      ...acc,
      id: acc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (existingAccounts.length + idx + 1),
    }));
    const allAccounts = [...existingAccounts, ...newAccounts];
    const accountIdByName = new Map(allAccounts.map((a) => [a.name.toLowerCase(), a.id]));

    // Merge Bills
    const newBills = (importedBills || []).map((b) => ({
      id: b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (b.dueDay || 1),
      name: b.name,
      amount: b.amount,
      dueDay: b.dueDay,
      payer: b.payer,
      category: b.category,
      accountId: (b.accountName && accountIdByName.get(b.accountName.toLowerCase())) || residualAccountId || allAccounts[0]?.id || null,
    }));
    const allBills = [...existingBills, ...newBills];

    // Save
    handleUpdateAccounts(allAccounts, localResidualId);
    handleUpdateBills(allBills);
    
    // Sync Local
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
  const normalizeGoal = (goal) => ({
    scope: "personal",
    status: "active",
    pendingFor: null,
    createdBy: localRole,
    contributions: {},
    owner: localRole,
    startDate: "",
    endDate: "",
    accountId: null,
    ...goal,
  });

  const [localGoals, setLocalGoals] = useState(() => (goals || []).map(normalizeGoal));
  const [dirtyGoals, setDirtyGoals] = useState(false);

  useEffect(() => {
    setLocalGoals((goals || []).map(normalizeGoal));
  }, [goals]);

  const handleAddGoal = () => {
    const newGoal = normalizeGoal({
      id: `goal-${Date.now()}`,
      name: "New goal",
      targetAmount: 0,
      perMonth: 0,
      savedSoFar: 0,
    });
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
          updated.owner = goal.owner || localRole;
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
  const [localBillSharing, setLocalBillSharing] = useState(billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] });
  const [dirtyBillSharing, setDirtyBillSharing] = useState(false);

  useEffect(() => {
    committedBillSharingRef.current = billSharing;
    setLocalBillSharing(billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] });
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
  const goalsRef = useRef(null);
  const budgetsRef = useRef(null);

  useEffect(() => {
    if (!scrollToSection) return;
    const lower = String(scrollToSection).toLowerCase();
    if (lower === "goals" && goalsRef.current) {
      goalsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      onResetScrollHint();
    } else if (lower === "budgets" && budgetsRef.current) {
      budgetsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      onResetScrollHint();
    }
  }, [scrollToSection, onResetScrollHint]);

  // Dirty State Prop
  useEffect(() => {
    if (onDirtyChange) {
      const isDirty = dirtyStartingBalance || dirtyProfile || dirtyAccounts || dirtyRules || dirtyIncomeSchedule || dirtyGoals || dirtyBudgets || dirtyBillSharing;
      onDirtyChange(isDirty);
    }
  }, [dirtyStartingBalance, dirtyProfile, dirtyAccounts, dirtyRules, dirtyIncomeSchedule, dirtyGoals, dirtyBudgets, dirtyBillSharing, onDirtyChange]);

  return (
    <div className="min-h-svh bg-surface-50">
      <header className="px-4 pt-4 pb-3 border-b border-surface-200 bg-white">
        <div className="flex items-center gap-2">
          <SettingsIcon className="text-surface-700" size={18} />
          <div>
            <div className="text-xs font-semibold text-surface-900">Settings</div>
            <div className="text-[11px] text-surface-500">Manage your household, accounts, and goals</div>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Offline mode: settings changes are disabled until you reconnect.
        </div>
      )}

      <section className={`px-4 pt-3 pb-20 space-y-4 max-w-md mx-auto ${actionsDisabled ? "pointer-events-none opacity-60" : ""}`}>
        <ProfileForm
          uid={userProfile.uid}
          localHouseholdId={localHouseholdId}
          localRole={localRoleState}
          dirtyProfile={dirtyProfile}
          onProfileChange={handleProfileChange}
          onSaveProfile={handleSaveProfile}
        />

        <section className="mt-4">
          <Card className="p-4">
            <StartingBalanceCard
              startingBalance={localStartingBalance}
              dirtyStartingBalance={dirtyStartingBalance}
              onStartingBalanceChange={handleStartingBalanceChange}
              onSaveStartingBalance={handleSaveStartingBalance}
            />
          </Card>
        </section>

        <section className="mt-4">
          <Card className="p-4">
            <BalancesSummaryCard
              total={formatMoney(balances.total)}
              husband={formatMoney(balances.husband)}
              wife={formatMoney(balances.wife)}
            />
          </Card>
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

        <section className="mt-4">
          <Card className="p-4">
            <AllocationRulesForm
              rules={localRules}
              accounts={localAccounts}
              dirtyRules={dirtyRules}
              onAddRule={handleAddRule}
              onRuleChange={handleRuleChange}
              onDeleteRule={handleDeleteRule}
              onSaveRules={handleSaveRules}
            />
          </Card>
        </section>

        <section className="mt-4">
          <Card className="p-4 space-y-4">
            <IncomeScheduleForm
              income={localIncome}
              schedule={localSchedule}
              dirtyIncomeSchedule={dirtyIncomeSchedule}
              onIncomeChange={handleIncomeChange}
              onScheduleChange={handleScheduleChange}
              onSaveIncomeSchedule={handleSaveIncomeSchedule}
            />
          </Card>
        </section>

        <section className="mt-4">
          <Card className="p-4">
            <BillSharingForm
              billSharing={localBillSharing}
              dirtyBillSharing={dirtyBillSharing}
              onModeChange={handleBillSharingModeChange}
              onPercentageChange={handleBillSharingPercentageChange}
              onSave={handleSaveBillSharing}
            />
          </Card>
        </section>

        <section ref={goalsRef} className="mt-4">
          <Card className="p-4">
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
          </Card>
        </section>

        <section ref={budgetsRef} className="mt-4">
          <Card className="p-4">
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
          </Card>
        </section>
      </section>
    </div>
  );
}
