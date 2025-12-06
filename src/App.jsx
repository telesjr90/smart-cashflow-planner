import React, { useState, useMemo, useCallback } from "react";

import ErrorBoundary from "./components/ErrorBoundary";

import { Layout } from "./components/layout/Layout"; // <--- NEW COMPONENT

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

import { loginWithGoogle, auth } from "./firebase";

import { projectCashflow, fromCents } from "./lib/cashflow/index.js";

import { getDefaultPlannerStartDate } from "./lib/cashflow/index.js";

// --- Helper Functions ---
function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
}

export default function App() {

  // 1. Activate Cloud Sync

  useFirebaseSync();



  // 2. Access Global Store

  const store = useCashflowStore();

  

  // Destructure state for easier usage

  const {

    userProfile,

    startDate,

    startingBalance,

    accounts,

    bills,

    expenses,

    income,

    paySchedule,

    allocationRules,

    residualAccountId,

    goals,

    categoryBudgets,

    extraIncomes,

    billSharing,

    paidBills,

    mode

  } = store;

  // --- UI State ---
  const [tab, setTab] = useState("home");
  const [settingsSection, setSettingsSection] = useState(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [personScope, setPersonScope] = useState("self");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

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

  // --- Derived Data (Compatibility Layer) ---

  const canEnter = !!userProfile.uid;

  const role = userProfile.role || "H";

  const householdId = userProfile.householdId || userProfile.uid;

  const householdCount = 1; // Simplified until household sync is fully implemented 

  const safeStartDate = startDate || getDefaultPlannerStartDate();

  const unifiedStartingBalance = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.reduce((sum, a) => sum + (Number(a.openingBalance || 0) || 0), 0);
    }
    return Number(startingBalance || 0);
  }, [accounts, startingBalance]);

  // Transform paidBills map to the nested flags expected by pages
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

  // Transform bills to include ownership

  const displayedBills = useMemo(() => {

    return bills.map((b) => ({

      ...b,

      ownerUid: userProfile.uid,

      ownerRole: role,

    }));

  }, [bills, userProfile.uid, role]);

  // Home Cashflow Summary Calculation
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
          paidBills,
          extraIncomes,
          expenses,
          mode: m,
        });
      
      const projProjected = runProjection("projected");
      const projActual = runProjection("actual");
      
      return { 
        projected: (projProjected.monthlySummary || [])[monthIndex] || null, 
        actual: (projActual.monthlySummary || [])[monthIndex] || null 
      };
    } catch (e) {
      console.warn("homeCashflowSummary failed", e);
      return null;
    }
  }, [safeStartDate, accounts, displayedBills, income, paySchedule, allocationRules, residualAccountId, paidBills, extraIncomes, expenses]);

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

        spent: 0, // Simplified for now

        remaining: cfg?.amount || 0,

      });

    });

    return list;

  }, [categoryBudgets]);

  // --- Login Screen ---

  if (!canEnter) {

    return (

      <ErrorBoundary>

        <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">

          <div className="max-w-sm w-full bg-white rounded-3xl shadow-soft p-8 text-center border border-surface-100">

            <div className="h-16 w-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">

              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57V48a24,24,0,0,0-24-24H136a24,24,0,0,0-24,24v1.57a29.53,29.53,0,0,0,9.91,21.41c.38.33.78.65,1.17,1H56A16,16,0,0,0,40,88v48a8,8,0,0,0,16,0V88H200v48a8,8,0,0,0,16,0V88A16,16,0,0,0,216,72ZM136,40h32a8,8,0,0,1,8,8v.83a13.93,13.93,0,0,1-4.65,10.38L168,62.14l-3.35-2.93A13.93,13.93,0,0,1,160,48.83V48A8,8,0,0,1,168,40h-8V56H144V40h-8a8,8,0,0,1,8-8Zm88,136V152a8,8,0,0,0-16,0v24a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152a8,8,0,0,0-16,0v24a24,24,0,0,0,24,24H200A24,24,0,0,0,224,176Zm-48-8a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,168Z"></path></svg>

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

  // --- Main App Layout ---

  return (

    <ErrorBoundary>

      <Layout

        currentTab={tab}

        onTabChange={handleTabChange}

        onAddPress={() => setIsExpenseModalOpen(true)}

        user={userProfile}

      >
        {/* 1. Home Dashboard */}

        {tab === "home" && (

          <Home

            role={role}

            personScope={personScope}

            setPersonScope={setPersonScope}

            startDate={safeStartDate}

            bills={displayedBills}

            paidFlags={paidFlags}

            mode={mode}

            setMode={store.setMode}

            income={income}

            paySchedule={paySchedule}

            accounts={accounts}

            allocationRules={allocationRules}

            residualAccountId={residualAccountId}

            startingBalance={unifiedStartingBalance}

            budgets={budgetListForHome}

            savingsToDate={savingsToDate}

            expenses={expenses}

            onAddExpense={() => setIsExpenseModalOpen(true)}

            onGoToSettings={() => setTab("settings")}

            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}

            onGoToBills={() => setTab("bills")}

            homeCashflowSummary={homeCashflowSummary}

          />

        )}

        {/* 2. Planner (Analysis) */}

        {tab === "planner" && (

          <Planner

            role={role}

            personScope={personScope}

            startDate={safeStartDate}

            bills={displayedBills}

            paidBills={paidBills}

            mode={mode}

            setMode={store.setMode}

            accounts={accounts}

            allocationRules={allocationRules}

            residualAccountId={residualAccountId}

            income={income}

            paySchedule={paySchedule}

            extraIncomes={extraIncomes}

            expenses={expenses}

          />

        )}

        {/* 3. Dashboard (Infographic - optional view) */}

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

        {/* 4. Bills (Wallet) */}

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

            onTogglePaid={(payload) => {

               const s = new Date(safeStartDate + "T00:00:00");

               const d = new Date(s.getFullYear(), s.getMonth() + payload.monthIndex, 1);

               const dateStr = d.toISOString().slice(0, 10);

               store.setPaidStatus(payload.billId, dateStr, payload.next);

            }}

            onChangeBillAccount={(billId, acctId) => {

               const newBills = bills.map(b => b.id === billId ? {...b, accountId: acctId} : b);

               store.updateBills(newBills);

            }}

            onUpdateBills={store.updateBills}

          />

        )}

        {/* 5. Settings (Profile) */}

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

            onUpdateAccounts={store.updateAccounts}

            onUpdateBills={store.updateBills}

            onUpdateAllocationRules={(rules) => console.log("Update allocations not yet in store")}

            onUpdateIncomeAndPaySchedule={(inc, sched) => store.setFullPlanData({ income: inc, paySchedule: sched })}

            onUpdateGoals={store.updateGoals}

            onUpdateBudgets={store.updateBudgets}

            onUpdateStartingBalance={(sb) => store.setFullPlanData({ startingBalance: sb })}

            onUpdateBillSharing={(bs) => store.setFullPlanData({ billSharing: bs })}

            onLogout={logout} // Passed here for Settings page use

            scrollToSection={settingsSection}

            onResetScrollHint={() => setSettingsSection(null)}

            onDirtyChange={setHasUnsavedSettings}

          />

        )}

        {/* 6. Expenses (Direct List View) */}

        {tab === "expenses" && (

          <Expenses

            expenses={expenses}

            accounts={accounts}

            onUpdateExpenses={store.updateExpenses}

          />

        )}



        {/* Global Modal for Adding Expenses */}

        <AddExpenseModal

          isOpen={isExpenseModalOpen}

          onClose={() => setIsExpenseModalOpen(false)}

          onSave={(newTransaction) => {
            const next = [...expenses, newTransaction];
            store.updateExpenses(next);
          }}

          accounts={accounts}

        />

      </Layout>

    </ErrorBoundary>

  );

}
