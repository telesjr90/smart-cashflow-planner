import React, { useState, useMemo, useCallback, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { Layout } from "./components/layout/Layout";
import Home from "./pages/Home";
import Bills from "./pages/Bills";
import Planner from "./pages/Planner";
import Settings from "./pages/Settings";
import Accounts from "./pages/Accounts";
import MonthlyCashFlowInfographic from "./MonthlyCashFlowInfographic";
import Expenses from "./pages/Expenses";
import AddExpenseModal from "./components/AddExpenseModal";

// --- Architecture Imports ---
import { useCashflowStore } from "./store/useCashflowStore";
import { useFirebaseSync } from "./hooks/useFirebaseSync";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { loginWithGoogle, auth } from "./firebase";
import { projectCashflow } from "./lib/cashflow/index.js";
import { getDefaultPlannerStartDate } from "./lib/cashflow/index.js";

// --- Helper Functions ---
function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
}

// --- Helper Component to Conditionally Run Hooks ---
// This ensures the sync hook NEVER runs when we are in demo mode
function FirebaseSyncHelper() {
  useFirebaseSync();
  return null;
}

export default function App() {
  // 1. Determine Mode
  const isDemo = typeof window !== "undefined" && window.location.search.includes("agentDemo=1");
  const { isOnline } = useNetworkStatus();

  // 2. Access Global Store
  const store = useCashflowStore();

  const {
    userProfile,
    startDate,
    startingBalance,
    accounts = [],
    bills = [],
    expenses = [],
    income = {},
    paySchedule = {},
    allocationRules = [],
    residualAccountId,
    goals,
    categoryBudgets,
    extraIncomes = [],
    billSharing,
    paidBills = {},
    mode,
    loading
  } = store;

  // --- UI State ---
  const [tab, setTab] = useState("home");
  const [settingsSection, setSettingsSection] = useState(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [personScope, setPersonScope] = useState("self");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // --- Demo Seeding Effect ---
  useEffect(() => {
    // IMPORTANT: Check userProfile.uid specifically to avoid loop.
    // If we are in demo mode AND the user is not yet the demo user, seed it.
    if (isDemo && userProfile?.uid !== "demo-user") {
      console.log("Agent Demo detected: Seeding mock user.");
      
      store.setUserProfile({
        uid: "demo-user",
        email: "demo@example.com",
        displayName: "Agent Demo",
        role: "H",
        householdId: "demo-household"
      });

      store.setFullPlanData({
        startDate: new Date().toISOString().slice(0, 10),
        startingBalance: 5000,
        accounts: [
            { id: 'acc1', name: 'Checking', type: 'checking', openingBalance: 5000 }
        ],
        bills: [],
        expenses: [],
        income: { husband: 4000, wife: 0 },
        paySchedule: { type: "semi-monthly", day1: 15, day2: "last" }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, userProfile?.uid]); 
  // ^^^ Removed 'store' from dependencies to prevent infinite update loop

  // --- Navigation & Warnings ---
  const handleGoToSettingsSection = useCallback((section) => {
    setSettingsSection(section);
    setTab("settings");
  }, []);

  const handleTabChange = useCallback((next) => {
    if (next === tab) return;
    if (hasUnsavedSettings) {
      if (!window.confirm("You have unsaved changes in Settings. Leave without saving?")) return;
    }
    setTab(next);
  }, [tab, hasUnsavedSettings]);

  const logout = useCallback(() => auth.signOut().catch(console.warn), []);

  // --- Derived Data ---
  const canEnter = !!userProfile.uid;
  const role = userProfile.role || "H";
  const householdId = userProfile.householdId || userProfile.uid;
  const householdCount = 1;

  const safeStartDate = startDate || getDefaultPlannerStartDate();
  const plannerMonths = 6;

  // Memoize expensive inputs to keep projectCashflow stable between renders
  const memoizedAccounts = useMemo(() => accounts.map((a) => ({ ...a })), [accounts]);
  const memoizedBills = useMemo(() => bills.map((b) => ({ ...b })), [bills]);
  const memoizedExpenses = useMemo(() => expenses.map((e) => ({ ...e })), [expenses]);
  const memoizedIncome = useMemo(() => ({ ...income }), [income]);
  const memoizedPaySchedule = useMemo(() => ({ ...paySchedule }), [paySchedule]);
  const memoizedAllocationRules = useMemo(
    () => (Array.isArray(allocationRules) ? allocationRules.map((r) => ({ ...r })) : []),
    [allocationRules]
  );
  const memoizedExtraIncomes = useMemo(
    () => (Array.isArray(extraIncomes) ? extraIncomes.map((ex) => ({ ...ex })) : []),
    [extraIncomes]
  );

  const unifiedStartingBalance = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.reduce((sum, a) => sum + (Number(a.openingBalance || 0) || 0), 0);
    }
    return Number(startingBalance || 0);
  }, [accounts, startingBalance]);

  const paidFlags = useMemo(() => {
    const flags = {};
    Object.entries(paidBills || {}).forEach(([key, isPaid]) => {
      if (!isPaid) return;
      const [dateStr, billId] = key.split(":");
      if (!dateStr || !billId) return;
      const monthIndex = getMonthIndexFromStart(safeStartDate, dateStr);
      if (monthIndex < 0 || monthIndex > 120) return;
      if (!flags[billId]) flags[billId] = {};
      flags[billId][monthIndex] = true;
    });
    return flags;
  }, [paidBills, safeStartDate]);

  const displayedBills = useMemo(() => {
    return memoizedBills.map((b) => ({
      ...b,
      ownerUid: userProfile.uid,
      ownerRole: role,
    }));
  }, [memoizedBills, userProfile.uid, role]);

  const cashflowInputs = useMemo(
    () => ({
      startDate: safeStartDate,
      accounts: memoizedAccounts,
      bills: displayedBills,
      income: memoizedIncome,
      paySchedule: memoizedPaySchedule,
      allocationRules: memoizedAllocationRules,
      residualAccountId,
      paidBills,
      extraIncomes: memoizedExtraIncomes,
      expenses: memoizedExpenses,
    }),
    [
      safeStartDate,
      memoizedAccounts,
      displayedBills,
      memoizedIncome,
      memoizedPaySchedule,
      memoizedAllocationRules,
      residualAccountId,
      paidBills,
      memoizedExtraIncomes,
      memoizedExpenses,
    ]
  );

  const projectionMonths = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthIndex = getMonthIndexFromStart(safeStartDate, todayStr);
    return Math.max(plannerMonths, monthIndex + 1);
  }, [safeStartDate, plannerMonths]);

  const cashflowInputsWithMonths = useMemo(
    () => ({
      ...cashflowInputs,
      months: projectionMonths,
    }),
    [cashflowInputs, projectionMonths]
  );

  const projectedCashflow = useMemo(
    () => projectCashflow({ ...cashflowInputsWithMonths, mode: "projected" }),
    [cashflowInputsWithMonths]
  );

  const actualCashflow = useMemo(
    () => projectCashflow({ ...cashflowInputsWithMonths, mode: "actual" }),
    [cashflowInputsWithMonths]
  );

  const activeCashflow = mode === "actual" ? actualCashflow : projectedCashflow;

  const savingsToDate = useMemo(
    () => (goals || []).reduce((acc, g) => acc + (g.savedSoFar || 0), 0),
    [goals]
  );

  const budgetListForHome = useMemo(() => {
    const list = [];
    Object.entries(categoryBudgets || {}).forEach(([cat, cfg]) => {
      list.push({
        id: cat,
        name: cfg?.label || cat,
        total: cfg?.amount || 0,
        spent: 0,
        remaining: cfg?.amount || 0,
      });
    });
    return list;
  }, [categoryBudgets]);

  const handleOpenExpenseModal = useCallback(() => {
    if (!isOnline) return;
    setIsExpenseModalOpen(true);
  }, [isOnline]);

  // --- Render ---

  // 1. Login Screen (Only shown if NOT logged in)
  if (!canEnter) {
    return (
      <ErrorBoundary>
        {/* IMPORTANT: Only run Cloud Sync if NOT in demo mode */}
        {!isDemo && <FirebaseSyncHelper />}

        <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-3xl shadow-soft p-8 text-center border border-surface-100">
            <div className="h-16 w-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57V48a24,24,0,0,0-24-24H136a24,24,0,0,0-24-24v1.57a29.53,29.53,0,0,0,9.91,21.41c.38.33.78.65,1.17,1H56A16,16,0,0,0,40,88v48a8,8,0,0,0,16,0V88H200v48a8,8,0,0,0,16,0V88A16,16,0,0,0,216,72ZM136,40h32a8,8,0,0,1,8,8v.83a13.93,13.93,0,0,1-4.65,10.38L168,62.14l-3.35-2.93A13.93,13.93,0,0,1,160,48.83V48A8,8,0,0,1,168,40h-8V56H144V40h-8a8,8,0,0,1,8-8Zm88,136V152a8,8,0,0,0-16,0v24a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152a8,8,0,0,0-16,0v24a24,24,0,0,0,24,24H200A24,24,0,0,0,224,176Zm-48-8a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,168Z"></path></svg>
            </div>
            <h1 className="text-title-l font-bold text-surface-900 mb-2">Budget Tracker</h1>
            <p className="text-body text-surface-500 mb-8">Manage your cash flow with ease.</p>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full inline-flex items-center justify-center rounded-pill px-6 py-3 text-body font-semibold bg-primary-600 text-white shadow-glow hover:bg-primary-700 transition-all"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // 2. Main App
  return (
    <ErrorBoundary>
      {/* IMPORTANT: Only run Cloud Sync if NOT in demo mode */}
      {!isDemo && <FirebaseSyncHelper />}

      <Layout
        currentTab={tab}
        onTabChange={handleTabChange}
        onAddPress={handleOpenExpenseModal}
        user={userProfile}
        isOnline={isOnline}
      >
        {tab === "home" && (
          <Home
            startDate={safeStartDate}
            bills={displayedBills}
            paidBills={paidBills}
            cashflow={activeCashflow}
            budgets={budgetListForHome}
            savingsToDate={savingsToDate}
            isLoading={loading}
            onAddExpense={handleOpenExpenseModal}
            onGoToSettings={() => setTab("settings")}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToBills={() => setTab("bills")}
          />
        )}

        {tab === "planner" && (
          <Planner
            cashflow={activeCashflow}
            months={plannerMonths}
          />
        )}

        {tab === "dashboard" && (
          <MonthlyCashFlowInfographic
            uid={userProfile.uid}
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
            liveGoals={goals}
            liveCategoryBudgets={categoryBudgets}
            paidBills={paidFlags}
            mergeWrite={(data) => console.log("Infographic write:", data)} 
            liveExtraIncomes={extraIncomes}
            liveExpenses={expenses}
            mode={mode}
            setMode={store.setMode}
          />
        )}

        {tab === "bills" && (
          <Bills personScope={personScope} isOnline={isOnline} />
        )}

        {tab === "settings" && (
          <Settings
            uid={userProfile.uid}
            email={userProfile.email}
            displayName={userProfile.displayName}
            role={role}
            householdId={householdId}
            householdCount={householdCount}
            onUpdateProfile={store.setUserProfile}
            balances={{ total: 0, husband: 0, wife: 0 }}
            startDate={safeStartDate}
            startingBalance={startingBalance}
            accounts={accounts}
            bills={bills}
            residualAccountId={residualAccountId}
            allocationRules={allocationRules}
            income={income}
            paySchedule={paySchedule}
            goals={goals}
            categoryBudgets={categoryBudgets}
            billSharing={billSharing}
            isOnline={isOnline}
            onUpdateAccounts={store.updateAccounts}
            onUpdateBills={store.updateBills}
            onUpdateAllocationRules={(rules) => console.log("Update allocations not yet in store")}
            onUpdateIncomeAndPaySchedule={(inc, sched) => store.setFullPlanData({ income: inc, paySchedule: sched })}
            onUpdateGoals={store.updateGoals}
            onUpdateBudgets={store.updateBudgets}
            onUpdateStartingBalance={(sb) => store.setFullPlanData({ startingBalance: sb })}
            onUpdateBillSharing={(bs) => store.setFullPlanData({ billSharing: bs })}
            onLogout={logout} 
            scrollToSection={settingsSection}
            onResetScrollHint={() => setSettingsSection(null)}
            onDirtyChange={setHasUnsavedSettings}
          />
        )}

        {tab === "expenses" && (
          <Expenses
            expenses={expenses}
            accounts={accounts}
            onUpdateExpenses={store.updateExpenses}
          />
        )}

        <AddExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={(newTransaction) => {
            const next = [...expenses, newTransaction];
            store.updateExpenses(next);
          }}
          accounts={accounts}
          isOnline={isOnline}
        />
      </Layout>
    </ErrorBoundary>
  );
}
