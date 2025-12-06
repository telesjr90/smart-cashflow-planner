// File: src/App.jsx
import React, { useState, useMemo, useCallback, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/layout/AppShell";
import Home from "./pages/Home";
import Bills from "./pages/Bills";
import Planner from "./pages/Planner";
import Settings from "./pages/Settings";
import Accounts from "./pages/Accounts";
import MonthlyCashFlowInfographic from "./MonthlyCashFlowInfographic";
import Expenses from "./pages/Expenses";
import AddExpenseModal from "./components/AddExpenseModal";

// Core logic hook
import useCashflowData from "./hooks/useCashflowData";

// Libs for derived data calculation
import { projectCashflow } from "./lib/cashflow/index.js";
import { applyBillSharing } from "./lib/billSharing";
import { getDefaultPlannerStartDate } from "./lib/cashflow/index.js";
import { loginWithGoogle, auth } from "./firebase";

// Date helper needed for Home summary calculation
function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (
    (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth())
  );
}

function getDateStrForMonthIndex(startDate, monthIndex) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(s.getFullYear(), s.getMonth() + monthIndex, 1);
  return d.toISOString().slice(0, 10);
}

const withIds = (arr) =>
  arr.map((b) => ({
    ...b,
    id: b.id || `${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${b.dueDay}`,
    accountId: b.accountId || "chequing",
  }));

export default function App() {
  const {
    user,
    me,
    myData,
    household,
    loading,
    hasCached,
    isAgentDemo,
    DEFAULT_STARTING_BALANCE,
    DEFAULT_INCOME,
    DEFAULT_PAY_SCHEDULE,
    
    // Handlers
    handleUpdateBills,
    handleChangeBillAccount,
    handleTogglePaid,
    handleBulkMark,
    handleUpdateAccounts,
    handleUpdateAllocationRules,
    handleUpdateIncomeAndPaySchedule,
    handleUpdateGoals,
    handleUpdateBudgets,
    handleUpdateStartingBalance,
    handleUpdateExpenses,
    handleAddExpense,
    handleUpdateExtraIncome,
    handleUpdateBillSharing,
    handleUpdateProfile,
    handleInfographicMergeWrite,
  } = useCashflowData();

  // --- UI State ---
  const [tab, setTab] = useState("home");
  const [settingsSection, setSettingsSection] = useState(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [personScope, setPersonScope] = useState("self");
  const [mode, setMode] = useState("projected");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // --- Navigation & Warnings ---
  const handleGoToSettingsSection = useCallback((section) => {
    setSettingsSection(section);
    setTab("settings");
  }, []);

  const handleTabChange = useCallback(
    (next) => {
      if (next === tab) return;
      if (hasUnsavedSettings) {
        const ok = window.confirm(
          "You have unsaved changes in Settings. Leave without saving?"
        );
        if (!ok) return;
      }
      setTab(next);
    },
    [tab, hasUnsavedSettings]
  );

  useEffect(() => {
    if (!hasUnsavedSettings) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedSettings]);

  const logout = useCallback(() => {
    if (isAgentDemo) return;
    auth.signOut().catch(console.warn);
  }, [isAgentDemo]);

  // --- Derived Data for Views ---
  // (Most logic below calculates 'view' state derived from the raw data in hook)

  const canEnter = !!user;
  const role = me?.profile?.role || "H";
  const householdId = me?.profile?.householdId || user?.uid || "";
  const householdCount = Math.max(1, household?.length || 0);

  const unifiedStartingBalance = useMemo(() => {
    const acct = myData?.accounts || [];
    if (acct.length > 0) {
      return acct.reduce(
        (sum, a) => sum + (Number(a.openingBalance || 0) || 0),
        0
      );
    }
    return Number(myData?.startingBalance || 0);
  }, [myData?.accounts, myData?.startingBalance]);

  const balances = useMemo(() => {
    const h = myData?.balanceSplit?.husband ?? 0;
    const w = myData?.balanceSplit?.wife ?? 0;
    return { total: h + w, husband: h, wife: w };
  }, [myData]);

  const paidFlags = useMemo(() => {
    const flags = {};
    const startDate = myData?.startDate || getDefaultPlannerStartDate();
    const map = myData?.paidBills || {};
    Object.entries(map).forEach(([key, value]) => {
      if (!value) return;
      const [dateStr, billId] = key.split(":");
      if (!dateStr || !billId) return;
      const monthIndex = getMonthIndexFromStart(startDate, dateStr);
      if (monthIndex < 0 || monthIndex > 120) return;
      if (!flags[billId]) flags[billId] = {};
      flags[billId][monthIndex] = true;
    });
    return flags;
  }, [myData?.paidBills, myData?.startDate]);

  const safeStartDate = myData?.startDate || new Date().toISOString().slice(0, 10);
  
  const accounts = useMemo(() => {
    const acct = myData?.accounts;
    if (acct && acct.length > 0) return acct;
    return [
      {
        id: "chequing",
        name: "Chequing",
        type: "deposit",
        openingBalance: unifiedStartingBalance,
      },
    ];
  }, [myData?.accounts, unifiedStartingBalance]);

  const allocationRules = myData?.allocationRules || [];
  const residualAccountId = myData?.residualAccountId || accounts[0]?.id;

  const income = useMemo(
    () => ({
      husband: Number(myData?.income?.husband || DEFAULT_INCOME.husband),
      wife: Number(myData?.income?.wife || DEFAULT_INCOME.wife),
    }),
    [myData, DEFAULT_INCOME]
  );

  const paySchedule = myData?.paySchedule || DEFAULT_PAY_SCHEDULE;
  const extraIncomes = myData?.extraIncomes || [];

  // Derived: Bills (Shared vs Displayed)
  const householdBills = useMemo(() => {
    if (!household || household.length === 0) return [];
    const merged = [];
    household.forEach((member) => {
      const data = member?.data || {};
      const bills = withIds(data.bills || []);
      bills.forEach((b) => {
        merged.push({
          ...b,
          ownerUid: member.uid,
          ownerRole: member.profile?.role || "H",
        });
      });
    });
    return merged;
  }, [household]);

  const displayedBills = useMemo(() => {
    if (householdBills.length > 0) return householdBills;
    const self = myData?.bills || [];
    return self.map((b) => ({
      ...b,
      ownerUid: user?.uid,
      ownerRole: role,
    }));
  }, [householdBills, myData, user, role]);

  // Derived: Home Cashflow Summary
  const homeCashflowSummary = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthIndex = getMonthIndexFromStart(safeStartDate, todayStr);
    const months = Math.max(1, monthIndex + 1);
    try {
      const runProjection = (m) =>
        projectCashflow({
          startDate: safeStartDate,
          months,
          accounts,
          bills: displayedBills,
          income,
          paySchedule,
          allocationRules,
          residualAccountId,
          paidBills: myData?.paidBills || {},
          extraIncomes: myData?.extraIncomes || [],
          expenses: myData?.expenses || [],
          mode: m,
        });
      const projProjected = runProjection("projected");
      const projActual = runProjection("actual");
      const monthSummaryProjected = (projProjected.monthlySummary || [])[monthIndex] || null;
      const monthSummaryActual = (projActual.monthlySummary || [])[monthIndex] || null;
      return { projected: monthSummaryProjected, actual: monthSummaryActual };
    } catch (e) {
      console.warn("homeCashflowSummary failed", e);
      return null;
    }
  }, [
    myData, safeStartDate, accounts, displayedBills, income, paySchedule,
    allocationRules, residualAccountId
  ]);

  // Derived: Budget List for Home
  const budgetListForHome = useMemo(() => {
    const raw = myData?.categoryBudgets || {};
    const expenses = myData?.expenses || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthIndex = getMonthIndexFromStart(safeStartDate, todayStr);

    const spentByCategory = {};
    for (const exp of expenses) {
      const dateStr = exp.date || exp.dateStr;
      if (!dateStr) continue;
      const mIdx = getMonthIndexFromStart(safeStartDate, dateStr);
      if (mIdx !== currentMonthIndex) continue;

      const catKey = exp.category || exp.categoryId || "uncategorized";
      const value = Number(exp.amount || 0) || 0;
      if (!spentByCategory[catKey]) spentByCategory[catKey] = 0;
      spentByCategory[catKey] += value;
    }

    const list = [];
    Object.entries(raw).forEach(([cat, cfg]) => {
      if (cfg?.status && cfg.status !== "active") return;
      let total = 0;
      if (cfg?.contributions && typeof cfg.contributions === "object") {
        total = (cfg.contributions.H || 0) + (cfg.contributions.W || 0);
      } else {
        total = cfg?.amount || 0;
      }
      if (!total) return;
      const spent = spentByCategory[cat] || 0;
      list.push({
        id: cat,
        name: cfg?.label || cat,
        total,
        spent,
        remaining: total - spent,
      });
    });
    return list;
  }, [myData?.categoryBudgets, myData?.expenses, safeStartDate]);

  const savingsToDate = useMemo(
    () => (myData?.goals || []).reduce((acc, g) => acc + (g.savedSoFar || 0), 0),
    [myData?.goals]
  );

  const pendingSharedGoalsForMe = useMemo(
    () => (myData?.goals || []).filter((g) => g?.status === "pending" && g?.pendingFor === role).length,
    [myData?.goals, role]
  );

  const pendingSharedBudgetsForMe = useMemo(() => {
    return Object.values(myData?.categoryBudgets || {}).filter(
      (b) => b?.status === "pending" && b?.pendingFor === role
    ).length;
  }, [myData?.categoryBudgets, role]);

  const greetingName = me?.profile?.displayName?.split(" ")[0] || user?.displayName?.split(" ")[0] || "there";

  // --- Rendering ---

  if (loading && !hasCached) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <div className="flex-1 max-w-md mx-auto w-full bg-white shadow-sm border-x border-slate-200 flex flex-col">
            <div className="p-6 text-sm text-slate-600">Loading...</div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (isAgentDemo && !canEnter) {
    return <div className="p-6 text-center">Loading demo mode...</div>;
  }

  if (!canEnter) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <div className="flex-1 max-w-md mx-auto w-full bg-white shadow-sm border-x border-slate-200 flex flex-col">
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 gap-4">
              <div className="text-center space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-400">Smart Cash Flow Planner</div>
                <div className="text-lg font-semibold text-slate-900">Sign in to continue</div>
              </div>
              <button
                type="button"
                onClick={loginWithGoogle}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell
        tab={tab}
        onTabChange={handleTabChange}
        greetingName={greetingName}
        onLogout={logout}
        footer={
          <AddExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            onSave={handleAddExpense}
            accounts={accounts}
          />
        }
      >
        {tab === "home" && (
          <Home
            role={role}
            personScope={personScope}
            setPersonScope={setPersonScope}
            startDate={safeStartDate}
            bills={displayedBills}
            paidFlags={paidFlags}
            mode={mode}
            setMode={setMode}
            income={income}
            paySchedule={paySchedule}
            accounts={accounts}
            allocationRules={allocationRules}
            residualAccountId={residualAccountId}
            startingBalance={myData?.startingBalance ?? DEFAULT_STARTING_BALANCE}
            budgets={budgetListForHome}
            savingsToDate={savingsToDate}
            onAddExpense={() => setIsExpenseModalOpen(true)}
            expenses={myData?.expenses || []}
            onGoToSettings={() => setTab("settings")}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToBills={() => setTab("bills")}
            pendingGoalsCount={pendingSharedGoalsForMe}
            pendingBudgetsCount={pendingSharedBudgetsForMe}
            onGoToReviewPending={() => handleGoToSettingsSection("goals")}
            homeCashflowSummary={homeCashflowSummary}
          />
        )}

        {tab === "planner" && (
          <Planner
            role={role}
            personScope={personScope}
            startDate={safeStartDate}
            bills={displayedBills}
            paidBills={myData?.paidBills || {}}
            mode={mode}
            setMode={setMode}
            accounts={accounts}
            allocationRules={allocationRules}
            residualAccountId={residualAccountId}
            income={income}
            paySchedule={paySchedule}
            extraIncomes={extraIncomes}
            expenses={myData?.expenses || []}
          />
        )}

        {tab === "dashboard" && (
          <MonthlyCashFlowInfographic
            uid={user?.uid}
            householdId={householdId}
            role={role}
            personScope={personScope}
            liveStartDate={safeStartDate}
            liveIncome={income}
            livePaySchedule={paySchedule}
            liveBills={displayedBills}
            liveAccounts={accounts}
            liveStartingBalance={unifiedStartingBalance}
            liveAllocationRules={allocationRules}
            liveGoals={myData?.goals || []}
            liveCategoryBudgets={myData?.categoryBudgets || {}}
            paidBills={paidFlags}
            mergeWrite={handleInfographicMergeWrite}
            liveExtraIncomes={extraIncomes}
            onUpdateExtraIncomes={handleUpdateExtraIncome}
            liveExpenses={myData?.expenses || []}
            mode={mode}
            setMode={setMode}
          />
        )}

        {tab === "bills" && (
          <Bills
            householdId={householdId}
            role={role}
            startDate={safeStartDate}
            bills={displayedBills}
            paidFlags={paidFlags}
            personScope={personScope}
            accounts={accounts}
            residualAccountId={residualAccountId}
            onTogglePaid={handleTogglePaid}
            onBulkMark={handleBulkMark}
            onChangeBillAccount={handleChangeBillAccount}
            onUpdateBills={handleUpdateBills}
          />
        )}

        {tab === "settings" && (
          <Settings
            uid={user?.uid}
            email={me?.profile?.email || user.email || ""}
            displayName={me?.profile?.displayName || user.displayName || ""}
            role={role}
            householdId={householdId}
            householdCount={householdCount}
            onUpdateProfile={handleUpdateProfile}
            balances={balances}
            startDate={safeStartDate}
            startingBalance={myData?.startingBalance ?? DEFAULT_STARTING_BALANCE}
            accounts={accounts}
            bills={myData?.bills || []}
            residualAccountId={residualAccountId}
            allocationRules={allocationRules}
            income={income}
            paySchedule={paySchedule}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateBills={handleUpdateBills}
            onUpdateAllocationRules={handleUpdateAllocationRules}
            onUpdateIncomeAndPaySchedule={handleUpdateIncomeAndPaySchedule}
            goals={myData?.goals || []}
            categoryBudgets={myData?.categoryBudgets || {}}
            onUpdateGoals={handleUpdateGoals}
            onUpdateBudgets={handleUpdateBudgets}
            onUpdateStartingBalance={handleUpdateStartingBalance}
            billSharing={myData?.billSharing}
            onUpdateBillSharing={handleUpdateBillSharing}
            scrollToSection={settingsSection}
            onResetScrollHint={() => setSettingsSection(null)}
            onDirtyChange={setHasUnsavedSettings}
          />
        )}

        {tab === "accounts" && (
          <Accounts
            accounts={accounts}
            residualAccountId={residualAccountId}
            balances={{}}
            allocationRules={allocationRules}
            income={income}
            paySchedule={paySchedule}
            bills={displayedBills}
            expenses={myData?.expenses || []}
            goals={myData?.goals || []}
            categoryBudgets={myData?.categoryBudgets || {}}
            startDate={safeStartDate}
            paidBills={myData?.paidBills || {}}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateAllocationRules={handleUpdateAllocationRules}
            onUpdateIncomeAndPaySchedule={handleUpdateIncomeAndPaySchedule}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToSettingsGoals={() => handleGoToSettingsSection("goals")}
          />
        )}

        {tab === "expenses" && (
          <Expenses
            expenses={myData?.expenses || []}
            accounts={accounts}
            onUpdateExpenses={handleUpdateExpenses}
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}