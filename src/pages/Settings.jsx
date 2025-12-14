// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Settings as SettingsIcon, ChevronRight, UploadCloud, Loader2, X, Check, AlertTriangle, Calendar, FileSpreadsheet, Download, Split } from "lucide-react";

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
import { Button } from "../components/ui/Button";

// Services
import { scanBudgetSheet } from "../services/receiptScanner";
import { parseBudgetCSV, downloadBudgetTemplate } from "../services/csvScanner";

const DEFAULT_BUDGET_CATEGORIES = {
  housing: { label: "Housing", amount: 0 },
  groceries: { label: "Groceries", amount: 0 },
  transport: { label: "Transport", amount: 0 },
  diningOut: { label: "Dining / Takeout", amount: 0 },
  utilities: { label: "Utilities", amount: 0 },
  personal: { label: "Personal / Misc", amount: 0 },
};

export default function Settings({
  scrollToSection = null,
  onResetScrollHint = () => {},
  onDirtyChange,
  isOnline = true,
}) {
  const actionsDisabled = !isOnline;
  
  // 1. Fetch Data
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

  // 2. Fetch Actions
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

  const balances = useMemo(() => {
    const total = accounts.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0);
    return { total, husband: 0, wife: 0 };
  }, [accounts]);

  // --- Import Logic & State ---
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // Stores data for review
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);

  // Handler for Image Upload (AI)
  const handleBudgetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await scanBudgetSheet(file);
      setImportPreview(data);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to import budget sheet.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handler for CSV Upload (Manual Template)
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await parseBudgetCSV(file);
      setImportPreview(data);
    } catch (error) {
      console.error(error);
      alert("Failed to parse CSV. Please ensure you are using the correct template.");
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;

    // --- STEP 1: Smart Account Creation ---
    // We check if "Teles Checking" and "Nicole Checking" exist. If not, we create them.
    let currentAccounts = [...accounts];
    
    // Find or Create Husband's Account
    let accountH = currentAccounts.find(a => a.name.toLowerCase().includes("teles") || a.ownerRole === "H");
    if (!accountH) {
        accountH = {
            id: `acct-teles-${Date.now()}`,
            name: "Teles Checking",
            type: "deposit",
            openingBalance: 0,
            ownerRole: "H",
            ownerUid: null // Can be linked later if needed
        };
        currentAccounts.push(accountH);
    }

    // Find or Create Wife's Account
    let accountW = currentAccounts.find(a => a.name.toLowerCase().includes("nicole") || a.ownerRole === "W");
    if (!accountW) {
        accountW = {
            id: `acct-nicole-${Date.now()}`,
            name: "Nicole Checking",
            type: "deposit",
            openingBalance: 0,
            ownerRole: "W",
            ownerUid: null
        };
        currentAccounts.push(accountW);
    }

    // Update the accounts store immediately so we can link bills to these IDs
    // Note: We'll call handleUpdateAccounts at the end to save everything.
    const residualId = residualAccountId || accountH.id; // Fallback to H if no residual

    // --- STEP 2: Process Income & Schedule ---
    if (importPreview.incomes) {
      const income1 = importPreview.incomes[0]?.amount || 0;
      const income2 = importPreview.incomes[1]?.amount || 0;

      const scheduleConfig = {
        frequency: importPreview.paySchedule?.frequency || "semi-monthly",
        day1: importPreview.paySchedule?.payDays?.[0] || 15,
        day2: importPreview.paySchedule?.payDays?.[1] || 30
      };

      handleUpdateIncomeAndPaySchedule(
        { husband: income1, wife: income2 },
        scheduleConfig
      );
    }

    // --- STEP 3: Process Expenses (Bills) ---
    if (importPreview.expenses && importPreview.expenses.length > 0) {
      
      let totalSharedH = 0;
      let totalSharedW = 0;
      
      const newBills = importPreview.expenses.map(b => {
        let payer = "Shared"; // Default
        let amountH = 0;
        let amountW = 0;

        // Determine Payer based on Split amounts
        if (b.split) {
           const keys = Object.keys(b.split);
           if (keys.length >= 2) {
              amountH = b.split[keys[0]] || 0; // User A (Husband)
              amountW = b.split[keys[1]] || 0; // User B (Wife)
           }
        }

        let assignedAccountId = residualId; // Default to shared/residual

        if (amountH > 0 && amountW === 0) {
           payer = "H";
           assignedAccountId = accountH.id; // Link to Teles Checking
        } else if (amountW > 0 && amountH === 0) {
           payer = "W";
           assignedAccountId = accountW.id; // Link to Nicole Checking
        } else {
           payer = "Shared";
           // Accumulate shared amounts
           totalSharedH += amountH;
           totalSharedW += amountW;
        }

        return {
          id: b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + (b.dueDay || 1),
          name: b.name,
          amount: b.totalAmount, // The full amount of the bill
          dueDay: b.dueDay || 1,
          accountId: assignedAccountId, // <-- SMART ASSOCIATION HERE
          payer: payer,
          category: b.category || "misc"
        };
      });

      handleUpdateBills(newBills);

      // Only update global split percentage based on the "Shared" bills found
      const grandTotalShared = totalSharedH + totalSharedW;
      if (grandTotalShared > 0) {
        const hPercent = totalSharedH / grandTotalShared;
        const wPercent = totalSharedW / grandTotalShared;

        handleUpdateBillSharing({
            mode: 'percentage',
            percentageSplit: { H: hPercent, W: wPercent },
            sharedBillIds: []
        });
      }
    }

    // --- STEP 4: Save Accounts ---
    // We do this last to ensure we have the complete list including any auto-created ones
    handleUpdateAccounts(currentAccounts, residualId);

    setImportPreview(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Local State Management ---
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

      {/* --- Import Review Modal --- */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-surface-100 border border-surface-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h3 className="text-title-m font-bold text-surface-900">Review Smart Import</h3>
              <button onClick={() => setImportPreview(null)} className="p-2 hover:bg-surface-200 rounded-full text-surface-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Pay Schedule Preview */}
              {importPreview.paySchedule && (
                 <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
                    <Calendar className="text-blue-500" size={20} />
                    <div>
                        <p className="text-caption font-bold text-blue-400">Detected Pay Schedule</p>
                        <p className="text-caption text-blue-200">
                            Payment Days: <strong>{importPreview.paySchedule.payDays?.join(" & ")}</strong> 
                            <span className="opacity-60"> ({importPreview.paySchedule.frequency})</span>
                        </p>
                    </div>
                 </div>
              )}

              {/* Income Preview */}
              <div className="space-y-3">
                <h4 className="text-caption font-bold uppercase text-surface-500">Income (Per Paycheck)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {(importPreview.incomes || []).map((inc, i) => (
                    <div key={i} className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                      <p className="text-caption text-surface-500">
                         {inc.user || (i === 0 ? "Partner H" : "Partner W")}
                      </p>
                      <p className="text-body font-semibold text-surface-900">{formatMoney(inc.amount)}</p>
                    </div>
                  ))}
                  {!importPreview.incomes && <p className="text-caption text-surface-400 italic col-span-2">No income detected</p>}
                </div>
              </div>

              {/* Bills Preview - FIXED VISIBILITY */}
              <div className="space-y-3">
                <h4 className="text-caption font-bold uppercase text-surface-500">Detected Expenses ({importPreview.expenses?.length || 0})</h4>
                {importPreview.expenses?.length > 0 ? (
                  <div className="divide-y divide-surface-200 border border-surface-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-surface-50">
                    {importPreview.expenses.map((bill, i) => {
                       let splitLabel = "";
                       if (bill.split) {
                          const h = bill.split["User A"] || 0;
                          const w = bill.split["User B"] || 0;
                          if (h > 0 && w === 0) splitLabel = "Husband Only";
                          else if (w > 0 && h === 0) splitLabel = "Wife Only";
                          else if (h > 0 && w > 0) splitLabel = "Shared";
                       }
                       
                       return (
                        <div key={i} className="p-3 flex items-center justify-between hover:bg-surface-100/50 transition-colors">
                            <div>
                                <p className="text-body font-medium text-surface-900">{bill.name}</p>
                                <div className="flex gap-2 mt-0.5">
                                    <span className="text-[10px] bg-surface-200 px-1.5 rounded text-surface-600 border border-surface-300">Due: {bill.dueDay}th</span>
                                    <span className="text-[10px] bg-surface-200 px-1.5 rounded text-surface-600 border border-surface-300">{bill.category}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-body font-semibold text-surface-900">{formatMoney(bill.totalAmount)}</p>
                                <div className="text-[10px] text-surface-500 font-medium">
                                   {splitLabel}
                                </div>
                            </div>
                        </div>
                       );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-warning-500/10 text-warning-600 rounded-xl flex items-center gap-2 border border-warning-500/20">
                      <AlertTriangle size={18} />
                      <p className="text-caption font-medium">No expenses found.</p>
                  </div>
                )}
              </div>
              
              <div className="text-caption text-surface-500 italic text-center">
                  This will configure your Income, Pay Schedule, and Bill Splits automatically.
              </div>
            </div>

            <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setImportPreview(null)}>Cancel</Button>
               <Button variant="primary" onClick={confirmImport} icon={Check}>Confirm &amp; Apply</Button>
            </div>
          </Card>
        </div>
      )}

      <main
        className={`max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8 pb-24 space-y-6 ${
          actionsDisabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {/* --- Import Section --- */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Card 1: AI Image Import */}
           <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-4 flex flex-col gap-3">
               <div className="flex items-center gap-2 text-primary-500 font-semibold">
                   <UploadCloud size={20} />
                   <span>AI Smart Import</span>
               </div>
               <p className="text-caption text-surface-500">
                   Upload a screenshot of your budget spreadsheet to auto-configure everything.
               </p>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleBudgetUpload}
               />
               <Button 
                  variant="outline"
                  className="w-full bg-surface-50 border-primary-500/30 text-primary-500 hover:bg-primary-500/10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
               >
                  {isImporting ? <Loader2 className="animate-spin" size={16} /> : "Upload Image"}
               </Button>
           </div>

           {/* Card 2: CSV Import */}
           <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 flex flex-col gap-3">
               <div className="flex items-center gap-2 text-surface-900 font-semibold">
                   <FileSpreadsheet size={20} />
                   <span>Spreadsheet Import</span>
               </div>
               <p className="text-caption text-surface-500">
                   Download our template, fill it out, and upload to bulk import data.
               </p>
               <input 
                  type="file" 
                  ref={csvInputRef} 
                  className="hidden" 
                  accept=".csv"
                  onChange={handleCsvUpload}
               />
               <div className="flex gap-2">
                   <Button 
                      variant="ghost"
                      className="flex-1 text-surface-600 hover:bg-surface-200"
                      onClick={downloadBudgetTemplate}
                      icon={Download}
                   >
                      Template
                   </Button>
                   <Button 
                      variant="outline"
                      className="flex-1 bg-surface-50 border-surface-300"
                      onClick={() => csvInputRef.current?.click()}
                   >
                      Upload CSV
                   </Button>
               </div>
           </div>
        </div>

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
              className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-body font-semibold transition-all
                  ${activeSection === item.key 
                    ? "bg-surface-100 border-primary-500 shadow-sm text-primary-500 ring-1 ring-primary-500" 
                    : "bg-surface-50 border-surface-200 text-surface-900 hover:bg-surface-100"
                  }
              `}
            >
              <span>{item.label}</span>
              <ChevronRight size={18} className={activeSection === item.key ? "text-primary-500" : "text-surface-400"} aria-hidden="true" />
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