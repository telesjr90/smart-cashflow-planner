import React, { useState, useMemo, useCallback } from "react";
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

// --- New Architecture Imports ---
import { useCashflowStore } from "./store/useCashflowStore";
import { useFirebaseSync } from "./hooks/useFirebaseSync";
import { loginWithGoogle, auth } from "./firebase";
import { projectCashflow } from "./lib/cashflow/index.js";
import { getDefaultPlannerStartDate } from "./lib/cashflow/index.js";

// --- Helper Functions ---
function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
}

export default function App() {
  // 1. Activate the Cloud Sync Engine
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

  const greetingName = userProfile.displayName?.split(" ")[0] || "there";

  // --- Rendering ---

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
            onSave={store.updateExpenses}
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
            setMode={store.setMode}
            income={income}
            paySchedule={paySchedule}
            accounts={accounts}
            allocationRules={allocationRules}
            residualAccountId={residualAccountId}
            startingBalance={unifiedStartingBalance}
            budgets={budgetListForHome}
            savingsToDate={savingsToDate}
            onAddExpense={() => setIsExpenseModalOpen(true)}
            expenses={expenses}
            onGoToSettings={() => setTab("settings")}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToBills={() => setTab("bills")}
            homeCashflowSummary={homeCashflowSummary}
          />
        )}

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

            mergeWrite={(data) => console.log("Infographic write (disabled in refactor)", data)} 
            liveExtraIncomes={extraIncomes}
            liveExpenses={expenses}
            mode={mode}
            setMode={store.setMode}
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
            onTogglePaid={(payload) => {
               // Map payload to store action
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

            onUpdateAllocationRules={(rules) => { 

               // Future: Add dedicated updateAllocationRules action if needed

               console.log("Update allocations triggered");

            }}

            onUpdateIncomeAndPaySchedule={(inc, sched) => {

               store.setFullPlanData({ income: inc, paySchedule: sched });

            }}

            onUpdateGoals={store.updateGoals}

            onUpdateBudgets={store.updateBudgets}

            onUpdateStartingBalance={(sb) => store.setFullPlanData({ startingBalance: sb })}

            onUpdateBillSharing={(bs) => store.setFullPlanData({ billSharing: bs })}

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
            expenses={expenses}
            goals={goals}
            categoryBudgets={categoryBudgets}
            startDate={safeStartDate}
            paidBills={paidBills}
            onUpdateAccounts={store.updateAccounts}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToSettingsGoals={() => handleGoToSettingsSection("goals")}
          />
        )}

        {tab === "expenses" && (
          <Expenses
            expenses={expenses}
            accounts={accounts}
            onUpdateExpenses={store.updateExpenses}
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}
