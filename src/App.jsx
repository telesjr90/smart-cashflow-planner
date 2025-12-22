import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "./components/layout/Layout";
import Home from "./pages/Home";
import Bills from "./pages/Bills";
import Planner from "./pages/Planner";
import Settings from "./pages/Settings";
import Expenses from "./pages/Expenses";
import Accounts from "./pages/Accounts";
import AddTransactionModal from "./components/AddTransactionModal.jsx";
import { Card, CardBody } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import "./index.css";

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
    loading,
  } = store;

  // --- UI State ---
  const [tab, setTab] = useState("home");
  const [settingsSection, setSettingsSection] = useState(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [personScope, setPersonScope] = useState("self");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // --- Demo Seeding Effect ---
  useEffect(() => {
    if (isDemo && userProfile?.uid !== "demo-user") {
      console.log("Agent Demo detected: Seeding mock user.");
      store.setUserProfile({
        uid: "demo-user",
        email: "demo@example.com",
        displayName: "Agent Demo",
        role: "H",
        householdId: "demo-household",
      });
      store.setFullPlanData({
        startDate: new Date().toISOString().slice(0, 10),
        startingBalance: 0,
        accounts: [],
        bills: [],
        expenses: [],
        income: { husband: 0, wife: 0 },
        paySchedule: { type: "semi-monthly", day1: 15, day2: "last" },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, userProfile?.uid]);

  // --- Navigation & Warnings ---
  const handleGoToSettingsSection = useCallback((section) => {
    setSettingsSection(section);
    setTab("settings");
  }, []);

  const handleTabChange = useCallback(
    (next) => {
      if (next === tab) return;
      if (hasUnsavedSettings) {
        if (!window.confirm("You have unsaved changes in Settings. Leave without saving?")) return;
      }
      setTab(next);
    },
    [tab, hasUnsavedSettings]
  );

  const logout = useCallback(() => auth.signOut().catch(console.warn), []);

  // --- Derived Data ---
  const canEnter = !!userProfile.uid;
  const role = userProfile.role || "H";
  const householdId = userProfile.householdId || userProfile.uid;
  const householdCount = 1;

  const safeStartDate = startDate || getDefaultPlannerStartDate();
  const plannerMonths = 6;

  // Memoize expensive inputs
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

  // TEMP DEBUG: cashflow logging when ?debugCashflow=1 is present
  const debugCashflow = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("debugCashflow") === "1";
  }, []);
  const debugLoggedRef = useRef(false);

  useEffect(() => {
    if (!debugCashflow || debugLoggedRef.current) return;

    const today = new Date().toISOString().slice(0, 10);
    const ledger = activeCashflow?.ledger || [];
    const incomeEvents = ledger.filter((ev) => ev?.kind === "income");
    const payDatesThisMonth = incomeEvents.filter((ev) => {
      const date = ev?.date || "";
      return date.slice(0, 7) === today.slice(0, 7);
    });
    const overlayExpenses =
      mode === "actual"
        ? ledger.filter((ev) => ev?.kind === "expense")
        : [];

    console.log("[TEMP DEBUG cashflow]", {
      today,
      startDate: safeStartDate,
      paySchedule,
      income,
      accountsCount: accounts.length,
      billsCount: bills.length,
      payDatesThisMonth: payDatesThisMonth.map((ev) => ({
        date: ev.date,
        amountCents: ev.amountCents,
      })),
      sampleIncomeEntries: incomeEvents.slice(0, 5).map((ev) => ({
        date: ev.date,
        amountCents: ev.amountCents,
      })),
      actualOverlayTransactions: overlayExpenses.slice(0, 5).map((ev) => ({
        date: ev.date,
        amountCents: ev.amountCents,
        description: ev.description,
      })),
    });

    debugLoggedRef.current = true;
  }, [debugCashflow, activeCashflow, mode, safeStartDate, paySchedule, income, accounts.length, bills.length]);

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

  const handleOpenTransactionModal = useCallback(() => {
    if (!isOnline) return;
    setIsTransactionModalOpen(true);
  }, [isOnline]);

  // --- Render ---

  // 1. Login Screen
  if (!canEnter) {
    return (
      <>
        {!isDemo && <FirebaseSyncHelper />}
        <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full">
            <Card variant="elevated">
              <CardBody className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-primary-500/10 text-primary-600 rounded-2xl flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57V48a24,24,0,0,0-24-24H136a24,24,0,0,0-24-24v1.57a29.53,29.53,0,0,0,9.91,21.41c.38.33.78.65,1.17,1H56A16,16,0,0,0,40,88v48a8,8,0,0,0,16,0V88H200v48a8,8,0,0,0,16,0V88A16,16,0,0,0,216,72ZM136,40h32a8,8,0,0,1,8,8v.83a13.93,13.93,0,0,1-4.65,10.38L168,62.14l-3.35-2.93A13.93,13.93,0,0,1,160,48.83V48A8,8,0,0,1,168,40h-8V56H144V40h-8a8,8,0,0,1,8-8Zm88,136V152a8,8,0,0,0-16,0v24a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152a8,8,0,0,0-16,0v24a24,24,0,0,0,24,24H200A24,24,0,0,0,224,176Zm-48-8a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,168Z"></path>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h1 className="text-title-l font-semibold text-surface-900">Budget Tracker</h1>
                  <p className="text-body text-surface-500">Manage your cash flow with ease.</p>
                </div>
                <Button onClick={loginWithGoogle} variant="primary" size="md" className="w-full">
                  Sign in with Google
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // 2. Main App
  return (
    <>
      {!isDemo && <FirebaseSyncHelper />}

      <div className="min-h-screen bg-surface-50 text-surface-900">
        <Layout
          currentTab={tab}
          onTabChange={handleTabChange}
          onAddPress={handleOpenTransactionModal}
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
              onAddExpense={handleOpenTransactionModal}
              onGoToSettings={() => setTab("settings")}
              onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
              onGoToBills={() => setTab("bills")}
              onGoToExpenses={() => setTab("expenses")}
            />
          )}

          {tab === "accounts" && (
            <Accounts
              accounts={accounts}
              bills={bills}
              goals={goals}
              budgets={categoryBudgets ? budgetListForHome : []}
              onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
              onGoToSettingsGoals={() => handleGoToSettingsSection("goals")}
              onAddAccount={() => handleGoToSettingsSection("accounts")}
            />
          )}

          {tab === "planner" && (
            <Planner
              cashflow={activeCashflow}
              months={plannerMonths}
              infographicProps={{
                uid: userProfile.uid,
                householdId,
                role,
                personScope,
                liveStartDate: safeStartDate,
                liveIncome: income,
                livePaySchedule: paySchedule,
                liveBills: displayedBills,
                liveAccounts: accounts,
                liveStartingBalance: unifiedStartingBalance,
                liveAllocationRules: allocationRules,
                liveGoals: goals,
                liveCategoryBudgets: categoryBudgets,
                paidBills: paidFlags,
                mergeWrite: (data) => console.log("Infographic write:", data),
                liveExtraIncomes: extraIncomes,
                liveExpenses: expenses,
                mode,
                setMode: store.setMode,
              }}
            />
          )}

          {tab === "bills" && <Bills personScope={personScope} isOnline={isOnline} />}

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
            <Expenses expenses={expenses} accounts={accounts} onUpdateExpenses={store.updateExpenses} />
          )}

          <AddTransactionModal
            isOpen={isTransactionModalOpen}
            onClose={() => setIsTransactionModalOpen(false)}
            onSave={(newTransaction) => {
              const next = [...expenses, newTransaction];
              // Use store action to avoid mounting extra Firebase listeners here
              store.updateExpenses(next);
            }}
            accounts={accounts}
            isOnline={isOnline}
          />
        </Layout>
      </div>
    </>
  );
}
