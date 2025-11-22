// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Settings as SettingsIcon,
  Users,
  Users2,
  CheckCircle2,
  Wallet,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Target,
  PieChart,
  Copy,
  Link as LinkIcon,
} from "lucide-react";

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function Settings({
  uid = "",
  email = "",
  displayName = "",
  role = "H",
  householdId = "",
  householdCount = 1,
  onUpdateProfile, // PHASE 5

  balances = { total: 0, husband: 0, wife: 0 },
  startDate,
  startingBalance = 0,
  accounts = [],
  residualAccountId,
  allocationRules = [],
  // Neutral defaults for income & pay schedule to avoid showing sample data
  income = { husband: 0, wife: 0 },
  paySchedule = { type: "semi-monthly", day1: 15, day2: "last" },
  onUpdateAccounts,
  onUpdateAllocationRules,
  onUpdateIncomeAndPaySchedule,
  goals = [],
  categoryBudgets = {},
  onUpdateGoals,
  onUpdateBudgets,
  onUpdateStartingBalance,
  // Bill sharing configuration and update handler
  billSharing = { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] },
  onUpdateBillSharing,
  // Optional scroll hint provided by App.jsx. When set to "goals" or
  // "budgets" the appropriate section will scroll into view on mount.
  scrollToSection = null,
  // Callback to reset the scroll hint once handled.
  onResetScrollHint = () => {},
}) {
  const primaryName = displayName || email || "User";
  const startLabel = startDate || "Not set";

  const formatMoney = (n) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);

  const roleLabel = role === "H" ? "Partner H" : role === "W" ? "Partner W" : role;

  // Local state for plan starting balance
  const [localStartingBalance, setLocalStartingBalance] = useState(
    startingBalance ?? 0
  );
  const [dirtyStartingBalance, setDirtyStartingBalance] = useState(false);

  useEffect(() => {
    setLocalStartingBalance(startingBalance ?? 0);
    setDirtyStartingBalance(false);
  }, [startingBalance]);

  // PHASE 5: Local State for Household Management
  const [localHouseholdId, setLocalHouseholdId] = useState(householdId);
  const [localRole, setLocalRole] = useState(role);
  const [dirtyProfile, setDirtyProfile] = useState(false);

  useEffect(() => {
    setLocalHouseholdId(householdId);
    setLocalRole(role);
  }, [householdId, role]);

  const handleSaveStartingBalance = () => {
    if (!onUpdateStartingBalance) return;
    onUpdateStartingBalance(
      localStartingBalance === "" ? 0 : Number(localStartingBalance) || 0
    );
    setDirtyStartingBalance(false);
  };

  const handleProfileChange = (field, value) => {
    if (field === "householdId") setLocalHouseholdId(value);
    if (field === "role") setLocalRole(value);
    setDirtyProfile(true);
  };

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        householdId: localHouseholdId,
        role: localRole
      });
    }
    setDirtyProfile(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied User ID!");
  };

  // Household account + residual account local state
  const [localAccounts, setLocalAccounts] = useState(accounts || []);
  const [localResidualId, setLocalResidualId] = useState(residualAccountId || null);
  const [dirtyAccounts, setDirtyAccounts] = useState(false);

  useEffect(() => {
    setLocalAccounts(accounts || []);
  }, [accounts]);

  useEffect(() => {
    setLocalResidualId(residualAccountId || null);
  }, [residualAccountId]);

  const handleAccountChange = (id, updates) => {
    setLocalAccounts((prev) =>
      prev.map((acct) => (acct.id === id ? { ...acct, ...updates } : acct))
    );
    setDirtyAccounts(true);
  };

  const handleAddAccount = () => {
    const newId = `acct-${Date.now()}`;
    setLocalAccounts((prev) => {
      const isFirst = prev.length === 0;
      const opening = isFirst
        ? // Allocate the plan's starting balance to the first account
          (localStartingBalance === "" || localStartingBalance == null
            ? 0
            : Number(localStartingBalance) || 0)
        : 0;
      return [
        ...prev,
        {
          id: newId,
          name: "New account",
          type: "deposit",
          openingBalance: opening,
        },
      ];
    });
    setDirtyAccounts(true);
  };

  const handleDeleteAccount = (id) => {
    setLocalAccounts((prev) => prev.filter((a) => a.id !== id));
    setDirtyAccounts(true);
  };

  const handleSaveAccounts = () => {
    if (!onUpdateAccounts) return;
    onUpdateAccounts(localAccounts, localResidualId);
    setDirtyAccounts(false);
  };

  const handleResidualChange = (value) => {
    setLocalResidualId(value || null);
    setDirtyAccounts(true);
  };

  // ---------- local editable state for allocation rules ----------
  const [localRules, setLocalRules] = useState(allocationRules || []);
  const [dirtyRules, setDirtyRules] = useState(false);

  useEffect(() => {
    setLocalRules(allocationRules || []);
  }, [allocationRules]);

  const handleAddRule = () => {
    const newRule = {
      id: `rule-${Date.now()}`,
      accountId: localResidualId || "",
      percentage: 0,
      label: "New rule",
    };
    setLocalRules((prev) => [...prev, newRule]);
    setDirtyRules(true);
  };

  const handleRuleChange = (id, updates) => {
    setLocalRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
    setDirtyRules(true);
  };

  const handleDeleteRule = (id) => {
    setLocalRules((prev) => prev.filter((rule) => rule.id !== id));
    setDirtyRules(true);
  };

  const handleSaveRules = () => {
    if (!onUpdateAllocationRules) return;
    onUpdateAllocationRules(localRules);
    setDirtyRules(false);
  };

  // ---------- Income & Schedule local state ----------
  const [localIncome, setLocalIncome] = useState({
    husband: income?.husband ?? 0,
    wife: income?.wife ?? 0,
  });

  const [localSchedule, setLocalSchedule] = useState({
    type: paySchedule?.type || "semi-monthly",
    day1: paySchedule?.day1 ?? 15,
    day2: paySchedule?.day2 ?? "last",
  });

  useEffect(() => {
    setLocalIncome({
      husband: income?.husband ?? 0,
      wife: income?.wife ?? 0,
    });
  }, [income]);

  useEffect(() => {
    setLocalSchedule({
      type: paySchedule?.type || "semi-monthly",
      day1: paySchedule?.day1 ?? 15,
      day2: paySchedule?.day2 ?? "last",
    });
  }, [paySchedule]);

  const [dirtyIncomeSchedule, setDirtyIncomeSchedule] = useState(false);

  const handleIncomeChange = (field, value) => {
    setLocalIncome((prev) => ({
      ...prev,
      [field]: value === "" ? "" : parseFloat(value),
    }));
    setDirtyIncomeSchedule(true);
  };

  const handleScheduleChange = (field, value) => {
    setLocalSchedule((prev) => ({
      ...prev,
      [field]: value,
    }));
    setDirtyIncomeSchedule(true);
  };

  const handleSaveIncomeSchedule = () => {
    if (!onUpdateIncomeAndPaySchedule) return;
    const cleanedIncome = {
      husband:
        localIncome.husband === "" ? 0 : Number(localIncome.husband) || 0,
      wife:
        localIncome.wife === "" ? 0 : Number(localIncome.wife) || 0,
    };
    const cleanedSchedule = {
      ...localSchedule,
      day1:
        localSchedule.day1 === "" ? 15 : Number(localSchedule.day1) || 15,
      day2:
        localSchedule.day2 === "" || localSchedule.day2 === "last"
          ? "last"
          : Number(localSchedule.day2) || "last",
    };
    onUpdateIncomeAndPaySchedule(cleanedIncome, cleanedSchedule);
    setDirtyIncomeSchedule(false);
  };

  // ---------- Goals local state ----------
  const [localGoals, setLocalGoals] = useState(goals || []);
  const [dirtyGoals, setDirtyGoals] = useState(false);

  useEffect(() => {
    setLocalGoals(goals || []);
  }, [goals]);

  const handleAddGoal = () => {
    const newGoal = {
      id: `goal-${Date.now()}`,
      name: "New goal",
      targetAmount: 0,
      perMonth: 0,
      savedSoFar: 0,
    };
    setLocalGoals((prev) => [...prev, newGoal]);
    setDirtyGoals(true);
  };

  const handleGoalChange = (id, updates) => {
    setLocalGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
    setDirtyGoals(true);
  };

  const handleDeleteGoal = (id) => {
    setLocalGoals((prev) => prev.filter((g) => g.id !== id));
    setDirtyGoals(true);
  };

  const handleSaveGoals = () => {
    if (!onUpdateGoals) return;
    onUpdateGoals(localGoals);
    setDirtyGoals(false);
  };

  // ---------- Category budgets local state ----------
  const [localBudgets, setLocalBudgets] = useState(categoryBudgets || {});
  const [dirtyBudgets, setDirtyBudgets] = useState(false);

  useEffect(() => {
    setLocalBudgets(categoryBudgets || {});
  }, [categoryBudgets]);

  const handleAddBudgetCategory = () => {
    const newKey = `category-${Date.now()}`;
    setLocalBudgets((prev) => ({
      ...prev,
      [newKey]: { label: "New category", amount: 0 },
    }));
    setDirtyBudgets(true);
  };

  const handleBudgetChange = (key, updates) => {
    setLocalBudgets((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
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
    if (!onUpdateBudgets) return;
    onUpdateBudgets(localBudgets);
    setDirtyBudgets(false);
  };

  // ---------- Bill sharing local state ----------
  const [localBillSharing, setLocalBillSharing] = useState(
    billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 } }
  );
  const [dirtyBillSharing, setDirtyBillSharing] = useState(false);

  useEffect(() => {
    setLocalBillSharing(
      billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 } }
    );
    setDirtyBillSharing(false);
  }, [billSharing]);

  const handleBillSharingModeChange = (mode) => {
    setLocalBillSharing((prev) => ({ ...prev, mode }));
    setDirtyBillSharing(true);
  };

  const handleBillSharingPercentageChange = (who, value) => {
    const val = Math.max(0, Math.min(100, Number(value) || 0));
    if (who === "H") {
      const hShare = val;
      const wShare = Math.max(0, 100 - hShare);
      setLocalBillSharing((prev) => ({
        ...prev,
        percentageSplit: { H: hShare / 100, W: wShare / 100 },
      }));
    } else if (who === "W") {
      const wShare = val;
      const hShare = Math.max(0, 100 - wShare);
      setLocalBillSharing((prev) => ({
        ...prev,
        percentageSplit: { H: hShare / 100, W: wShare / 100 },
      }));
    }
    setDirtyBillSharing(true);
  };

  const handleSaveBillSharing = () => {
    if (!onUpdateBillSharing) return;
    // Convert shares from decimals back to decimals (they are already decimals) but ensure keys exist
    const next = {
      mode: localBillSharing.mode,
      percentageSplit: {
        H: localBillSharing.percentageSplit?.H ?? 0.5,
        W: localBillSharing.percentageSplit?.W ?? 0.5,
      },
    };
    onUpdateBillSharing(next);
    setDirtyBillSharing(false);
  };

  // Derived arrays for display
  const budgetsArray = useMemo(
    () =>
      Object.entries(localBudgets).map(([key, cfg]) => ({
        key,
        label: cfg.label || key,
        amount: cfg.amount ?? 0,
      })),
    [localBudgets]
  );

  // Refs for scrolling to specific sections (goals & budgets) when requested
  const goalsRef = useRef(null);
  const budgetsRef = useRef(null);

  // When scrollToSection prop changes, scroll to the desired section
  useEffect(() => {
    if (!scrollToSection) return;
    const lower = String(scrollToSection).toLowerCase();
    if (lower === "goals" && goalsRef.current) {
      goalsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      onResetScrollHint && onResetScrollHint();
    } else if (lower === "budgets" && budgetsRef.current) {
      budgetsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      onResetScrollHint && onResetScrollHint();
    }
  }, [scrollToSection, onResetScrollHint]);

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <SettingsIcon className="text-slate-700" size={18} />
          <div>
            <div className="text-xs font-semibold text-slate-900">
              Settings
            </div>
            <div className="text-[11px] text-slate-500">
              Manage your household, accounts, and goals
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 pt-3 pb-20 space-y-4 max-w-md mx-auto">
        {/* Household & Profile */}
        <section className="mt-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">
                  Household & Profile
                </div>
              </div>
              {householdCount > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 size={13} />
                  Synced
                </span>
              )}
            </div>

            {/* User ID Copy */}
            <div className="mb-3">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Your User ID
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                  {uid || "(not signed in)"}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(uid)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-900"
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Share this ID with your partner to link your households.
              </p>
            </div>

            {/* Household ID */}
            <div className="mb-3">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Household ID (link to partner)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                  value={localHouseholdId}
                  onChange={(e) =>
                    handleProfileChange("householdId", e.target.value)
                  }
                  placeholder="Enter partner's User ID"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    if (!uid) return;
                    handleProfileChange("householdId", uid);
                  }}
                >
                  <LinkIcon size={11} />
                  Use my ID
                </button>
              </div>
            </div>

            {/* Role Toggle */}
            <div className="mb-3">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Who are you in this plan?
              </label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  onClick={() => handleProfileChange("role", "H")}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium ${
                    localRole === "H"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Husband (H)
                </button>
                <button
                  onClick={() => handleProfileChange("role", "W")}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border ${
                    localRole === "W"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Wife (W)
                </button>
              </div>
            </div>

            {dirtyProfile && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} />
                  Save profile
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Row label="Name" value={primaryName} />
              <Row label="Email" value={email} />
              <Row label="Members" value={`${householdCount} connected`} />
            </div>
          </Card>
        </section>

        

        {/* Plan starting balance */}
        <section className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="text-indigo-500" size={18} />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Plan starting balance
                </div>
                <div className="text-[10px] text-slate-500">
                  This is the starting balance your plan begins with. You can change it anytime; we save it to your household profile.
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
              <label htmlFor="starting-balance" className="text-slate-500">
                Starting balance
              </label>
              <input
                id="starting-balance"
                type="number"
                step="0.01"
                className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                value={
                  localStartingBalance === "" || localStartingBalance == null
                    ? ""
                    : localStartingBalance
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalStartingBalance(val === "" ? "" : parseFloat(val));
                  setDirtyStartingBalance(true);
                }}
              />
            </div>
            {dirtyStartingBalance && (
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveStartingBalance}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} />
                  Save
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Balances summary */}
        <section className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="text-indigo-500" size={18} />
              <div className="text-sm font-semibold text-slate-900">
                Current Balances (manual)
              </div>
            </div>
            <Row label="Household total" value={formatMoney(balances.total)} />
            <Row label="Partner H share" value={formatMoney(balances.husband)} />
            <Row label="Partner W share" value={formatMoney(balances.wife)} />
          </Card>
        </section>

        {/* Household income & pay schedule */}
        <section className="mt-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">
                  Household income &amp; pay schedule
                </div>
              </div>

              {dirtyIncomeSchedule && (
                <button
                  type="button"
                  onClick={handleSaveIncomeSchedule}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <CheckCircle2 size={12} />
                  Save
                </button>
              )}
            </div>

            <div className="space-y-3 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-slate-500">
                  Partner H income (per paycheque)
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  value={localIncome.husband === '' ? '' : localIncome.husband}
                  onChange={(e) =>
                    handleIncomeChange('husband', e.target.value)
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="text-slate-500">
                  Partner W income (per paycheque)
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  value={localIncome.wife === '' ? '' : localIncome.wife}
                  onChange={(e) =>
                    handleIncomeChange('wife', e.target.value)
                  }
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-slate-500">Pay schedule</div>
                  <div className="text-xs font-medium text-slate-700">
                    Semi-monthly
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-slate-500">First pay date (day)</div>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    value={localSchedule.day1}
                    onChange={(e) =>
                      handleScheduleChange('day1', Number(e.target.value))
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-slate-500">Second pay date</div>
                  <select
                    className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    value={localSchedule.day2}
                    onChange={(e) => handleScheduleChange('day2', e.target.value)}
                  >
                    <option value="last">Last day of month</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Household bill sharing */}
        <section className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users2 className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">
                  Household bill sharing
                </div>
              </div>
            </div>
            <div className="space-y-2 text-[11px]">
              {/* Mode selection */}
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="bill-sharing-mode"
                    value="manual"
                    className="h-3 w-3"
                    checked={localBillSharing.mode === "manual"}
                    onChange={() => handleBillSharingModeChange("manual")}
                  />
                  <span>Manual</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="bill-sharing-mode"
                    value="percentage"
                    className="h-3 w-3"
                    checked={localBillSharing.mode === "percentage"}
                    onChange={() => handleBillSharingModeChange("percentage")}
                  />
                  <span>Percentage split</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="bill-sharing-mode"
                    value="equalize"
                    className="h-3 w-3"
                    checked={localBillSharing.mode === "equalize"}
                    onChange={() => handleBillSharingModeChange("equalize")}
                  />
                  <span>Equal leftover</span>
                </label>
              </div>
              {/* Percentage inputs */}
              {localBillSharing.mode === "percentage" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500">H share (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                      value={Math.round((localBillSharing.percentageSplit?.H ?? 0.5) * 100)}
                      onChange={(e) =>
                        handleBillSharingPercentageChange("H", e.target.value)
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500">W share (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                      value={Math.round((localBillSharing.percentageSplit?.W ?? 0.5) * 100)}
                      onChange={(e) =>
                        handleBillSharingPercentageChange("W", e.target.value)
                      }
                    />
                  </label>
                </div>
              )}
              {/* Equalize explanation */}
              {localBillSharing.mode === "equalize" && (
                <p className="mt-2 text-[10px] text-slate-500">
                  We’ll assign shared bills so that after all shared bills are paid,
                  both partners have similar leftover money for the month.
                </p>
              )}
            </div>
            {dirtyBillSharing && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBillSharing}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} />
                  Save sharing
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Goals section */}
        <section ref={goalsRef} className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">
                  Goals
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddGoal}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={12} />
                Add goal
              </button>
            </div>
            {/* List of goals */}
            {localGoals.length === 0 && (
              <p className="text-xs text-slate-500">No goals defined yet.</p>
            )}
            <div className="space-y-3">
              {localGoals.map((goal) => (
                <div key={goal.id} className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Name</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={goal.name}
                        onChange={(e) =>
                          handleGoalChange(goal.id, { name: e.target.value })
                        }
                        placeholder="Goal name"
                      />
                    </label>
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Target</span>
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={goal.targetAmount}
                        onChange={(e) =>
                          handleGoalChange(goal.id, {
                            targetAmount:
                              e.target.value === "" ? "" : parseFloat(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Per month</span>
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={goal.perMonth}
                        onChange={(e) =>
                          handleGoalChange(goal.id, {
                            perMonth:
                              e.target.value === "" ? "" : parseFloat(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[10px] text-slate-500">
                      Saved so far: {formatMoney(goal.savedSoFar || 0)}
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {dirtyGoals && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGoals}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} />
                  Save goals
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Budgets section */}
        <section ref={budgetsRef} className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PieChart className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">
                  Budgets
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddBudgetCategory}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={12} />
                Add category
              </button>
            </div>
            {budgetsArray.length === 0 && (
              <p className="text-xs text-slate-500">No budget categories defined yet.</p>
            )}
            <div className="space-y-3">
              {budgetsArray.map(({ key, label, amount }) => (
                <div key={key} className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Category</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={label}
                        onChange={(e) =>
                          handleBudgetChange(key, { label: e.target.value })
                        }
                        placeholder="Category name"
                      />
                    </label>
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Amount</span>
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={amount}
                        onChange={(e) =>
                          handleBudgetChange(key, {
                            amount:
                              e.target.value === "" ? "" : parseFloat(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                        onClick={() => handleDeleteBudget(key)}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {dirtyBudgets && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBudgets}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} />
                  Save budgets
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Note: Accounts, Allocation Rules, and Income & Schedule sections remain unchanged and appear above. */}
      </section>
    </div>
  );
}
