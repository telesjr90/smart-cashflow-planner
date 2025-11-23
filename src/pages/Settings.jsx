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
  // Added ArrowRightLeft for allocation rules section
  ArrowRightLeft,
} from "lucide-react";
import BulkImportSpreadsheet from "../components/BulkImportSpreadsheet";

// Small card wrapper for consistent styling
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

// Row helper for balances summary
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

// Preset categories for budgets. These defaults are loaded when a new household
// has no budgets defined yet. Users can rename, add, or delete categories.
const DEFAULT_BUDGET_CATEGORIES = {
  housing: { label: "Housing", amount: 0 },
  groceries: { label: "Groceries", amount: 0 },
  transport: { label: "Transport", amount: 0 },
  diningOut: { label: "Dining / Takeout", amount: 0 },
  utilities: { label: "Utilities", amount: 0 },
  personal: { label: "Personal / Misc", amount: 0 },
};

/**
 * The Settings page allows the user to configure their household, accounts,
 * allocation rules, income, goals and budgets. It persists changes via
 * callbacks provided by the parent component (App.jsx).
 */
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
  bills = [],
  residualAccountId,
  allocationRules = [],
  // Neutral defaults for income & pay schedule to avoid showing sample data
  income = { husband: 0, wife: 0 },
  paySchedule = { type: "semi-monthly", day1: 15, day2: "last" },
  onUpdateAccounts,
  onUpdateBills,
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
  const [localStartingBalance, setLocalStartingBalance] = useState(startingBalance ?? 0);
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
    onUpdateStartingBalance(localStartingBalance === "" ? 0 : Number(localStartingBalance) || 0);
    setDirtyStartingBalance(false);
  };

  const handleProfileChange = (field, value) => {
    if (field === "householdId") setLocalHouseholdId(value);
    if (field === "role") setLocalRole(value);
    setDirtyProfile(true);
  };

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({ householdId: localHouseholdId, role: localRole });
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
    setLocalAccounts((prev) => prev.map((acct) => (acct.id === id ? { ...acct, ...updates } : acct)));
    setDirtyAccounts(true);
  };

  const handleAddAccount = () => {
    const newId = `acct-${Date.now()}`;
    setLocalAccounts((prev) => {
      const isFirst = prev.length === 0;
      const opening = isFirst
        ? // Allocate the plan's starting balance to the first account
          (localStartingBalance === "" || localStartingBalance == null ? 0 : Number(localStartingBalance) || 0)
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

  // Bulk import handler for CSV template (accounts + bills)
  const handleBulkImport = ({ accounts: importedAccounts, bills: importedBills }) => {
    const existingAccounts = accounts || [];
    const existingBills = bills || [];

    // 1. Assign IDs to imported accounts and merge with existing
    const newAccounts = (importedAccounts || []).map((acc, idx) => ({
      ...acc,
      id:
        acc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        (existingAccounts.length + idx + 1),
    }));

    const allAccounts = [...existingAccounts, ...newAccounts];

    // 2. Build lookup map from accountName -> accountId
    const accountIdByName = new Map(
      allAccounts.map((a) => [a.name.toLowerCase(), a.id])
    );

    // 3. Map imported bills to the app's bill shape, attaching accountId
    const newBills = (importedBills || []).map((b) => {
      const accountId =
        (b.accountName && accountIdByName.get(b.accountName.toLowerCase())) ||
        residualAccountId ||
        allAccounts[0]?.id ||
        null;

      return {
        id:
          b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
          "-" +
          (b.dueDay || 1),
        name: b.name,
        amount: b.amount,
        dueDay: b.dueDay,
        payer: b.payer,
        category: b.category,
        accountId,
      };
    });

    const allBills = [...existingBills, ...newBills];

    // 4. Persist via parent handlers if provided
    if (onUpdateAccounts) {
      onUpdateAccounts(allAccounts, localResidualId);
    }
    if (onUpdateBills) {
      onUpdateBills(allBills);
    }

    // 5. Sync local editable state with new accounts
    setLocalAccounts(allAccounts);
    setDirtyAccounts(false);
  };

  // ---------- local editable state for allocation rules ----------
  // When a new household has no rules defined, this array will be empty. Rules
  // define how income is routed to accounts on each paycheque.
  const [localRules, setLocalRules] = useState(allocationRules || []);
  const [dirtyRules, setDirtyRules] = useState(false);

  useEffect(() => {
    setLocalRules(allocationRules || []);
  }, [allocationRules]);

  const handleAddRule = () => {
    // Default to the first account or residual account if available
    const defaultAccount = (localAccounts && localAccounts[0] && localAccounts[0].id) || localResidualId || "";
    const newRule = {
      id: `rule-${Date.now()}`,
      accountId: defaultAccount,
      type: "percent",
      value: 0,
      frequency: "each",
      label: "New rule",
    };
    setLocalRules((prev) => [...prev, newRule]);
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
    if (!onUpdateAllocationRules) return;
    onUpdateAllocationRules(localRules);
    setDirtyRules(false);
  };

  // ---------- Income & Schedule local state ----------
  const [localIncome, setLocalIncome] = useState({ husband: income?.husband ?? 0, wife: income?.wife ?? 0 });
  const [localSchedule, setLocalSchedule] = useState({ type: paySchedule?.type || "semi-monthly", day1: paySchedule?.day1 ?? 15, day2: paySchedule?.day2 ?? "last" });

  useEffect(() => {
    setLocalIncome({ husband: income?.husband ?? 0, wife: income?.wife ?? 0 });
  }, [income]);

  useEffect(() => {
    setLocalSchedule({ type: paySchedule?.type || "semi-monthly", day1: paySchedule?.day1 ?? 15, day2: paySchedule?.day2 ?? "last" });
  }, [paySchedule]);

  const [dirtyIncomeSchedule, setDirtyIncomeSchedule] = useState(false);

  const handleIncomeChange = (field, value) => {
    setLocalIncome((prev) => ({ ...prev, [field]: value === "" ? "" : parseFloat(value) }));
    setDirtyIncomeSchedule(true);
  };

  const handleScheduleChange = (field, value) => {
    setLocalSchedule((prev) => ({ ...prev, [field]: value }));
    setDirtyIncomeSchedule(true);
  };

  const handleSaveIncomeSchedule = () => {
    if (!onUpdateIncomeAndPaySchedule) return;
    const cleanedIncome = {
      husband: localIncome.husband === "" ? 0 : Number(localIncome.husband) || 0,
      wife: localIncome.wife === "" ? 0 : Number(localIncome.wife) || 0,
    };
    const cleanedSchedule = {
      ...localSchedule,
      day1: localSchedule.day1 === "" ? 15 : Number(localSchedule.day1) || 15,
      day2: localSchedule.day2 === "" || localSchedule.day2 === "last" ? "last" : Number(localSchedule.day2) || "last",
    };
    onUpdateIncomeAndPaySchedule(cleanedIncome, cleanedSchedule);
    setDirtyIncomeSchedule(false);
  };

  // ---------- Goals local state ----------
  // Helper to normalize goals to include new shared fields with defaults.
  const normalizeGoal = (goal) => {
    return {
      scope: "personal",
      status: "active",
      pendingFor: null,
      createdBy: role || "H",
      contributions: {},
      ...goal,
    };
  };

  // Initialize localGoals by normalizing any incoming goals to ensure
  // required fields like scope, status, pendingFor, createdBy and
  // contributions exist. Defaults are applied for missing fields.
  const [localGoals, setLocalGoals] = useState(() =>
    (goals || []).map((g) => normalizeGoal(g))
  );
  const [dirtyGoals, setDirtyGoals] = useState(false);

  useEffect(() => {
    // When the upstream goals change (e.g. after a save or navigation),
    // normalize them into the expected shape for editing.
    setLocalGoals((goals || []).map((g) => normalizeGoal(g)));
  }, [goals]);

  const handleAddGoal = () => {
    // When adding a new goal we include the shared goal fields with sensible defaults.
    const newGoal = normalizeGoal({
      id: `goal-${Date.now()}`,
      name: "New goal",
      targetAmount: 0,
      perMonth: 0,
      savedSoFar: 0,
      // New goals are personal by default. createdBy is current role.
      scope: "personal",
      status: "active",
      pendingFor: null,
      createdBy: role || "H",
      contributions: {},
    });
    setLocalGoals((prev) => [...prev, newGoal]);
    setDirtyGoals(true);
  };

  const handleGoalChange = (id, updates) => {
    // Generic field updater for goals. Does not manage scope or contributions.
    setLocalGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
    setDirtyGoals(true);
  };

  // Update the goal's scope (personal/shared). When switching to shared,
  // initialize contributions if missing and derive perMonth from the sum.
  const handleGoalScopeChange = (id, scope) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const updated = { ...goal, scope };
        if (scope === "personal") {
          // Reset contributions when switching back to personal.
          updated.contributions = {};
          // perMonth remains user editable for personal goals.
        } else if (scope === "shared") {
          // Ensure contributions object exists and derive perMonth
          const H = updated.contributions?.H ?? 0;
          const W = updated.contributions?.W ?? 0;
          updated.contributions = { H, W };
          updated.perMonth = parseFloat(H || 0) + parseFloat(W || 0);
        }
        return updated;
      })
    );
    setDirtyGoals(true);
  };

  // Update one partner's contribution for a shared goal. Also update perMonth automatically.
  const handleGoalContributionChange = (id, who, value) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const amt = value === "" ? 0 : parseFloat(value) || 0;
        const contributions = { ...(goal.contributions || {}) };
        contributions[who] = amt;
        const perMonth = (contributions.H || 0) + (contributions.W || 0);
        return { ...goal, contributions, perMonth };
      })
    );
    setDirtyGoals(true);
  };

  // Update perMonth for personal goals. Shared goals auto-calculate perMonth instead.
  const handleGoalPerMonthChange = (id, value) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const perMonth = value === "" ? 0 : parseFloat(value) || 0;
        return { ...goal, perMonth };
      })
    );
    setDirtyGoals(true);
  };

  // Approve or reject a pending goal. Only applicable when status is pending and pendingFor matches the current role.
  const handleGoalApproval = (id, action) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        // Accept => active, Reject => rejected
        const status = action === "accept" ? "active" : "rejected";
        return { ...goal, status, pendingFor: null };
      })
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
  // Use defaults when incoming budgets are empty. Convert to array via useMemo below.
  const initialBudgets = useMemo(() => {
    const cats = categoryBudgets || {};
    return Object.keys(cats).length === 0 ? DEFAULT_BUDGET_CATEGORIES : cats;
  }, [categoryBudgets]);
  const [localBudgets, setLocalBudgets] = useState(initialBudgets);
  const [dirtyBudgets, setDirtyBudgets] = useState(false);

  useEffect(() => {
    const cats = categoryBudgets || {};
    setLocalBudgets(Object.keys(cats).length === 0 ? DEFAULT_BUDGET_CATEGORIES : cats);
  }, [categoryBudgets]);

  const handleAddBudgetCategory = () => {
    const newKey = `category-${Date.now()}`;
    setLocalBudgets((prev) => ({ ...prev, [newKey]: { label: "New category", amount: 0 } }));
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
    if (!onUpdateBudgets) return;
    onUpdateBudgets(localBudgets);
    setDirtyBudgets(false);
  };

  // ---------- Bill sharing local state ----------
  // Keep track of the last committed bill sharing configuration.  This
  // ref is updated whenever the parent prop changes or after a save.  It
  // is used to determine whether local edits are "dirty" relative to
  // the most recently saved state rather than depending on the parent
  // prop update timing.
  const committedBillSharingRef = useRef(billSharing);

  // Ensure the local editable state always contains the same shape as
  // the billSharing prop, including sharedBillIds so that missing keys
  // don't inadvertently mark the config as dirty.  Default to a
  // manual mode with an equal percentage split and no shared bills.
  const [localBillSharing, setLocalBillSharing] = useState(
    billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] }
  );
  const [dirtyBillSharing, setDirtyBillSharing] = useState(false);

  // When the upstream billSharing prop updates (e.g. after a
  // successful save or when the user navigates to another household),
  // synchronise our committed ref and reset the local editing state.
  useEffect(() => {
    committedBillSharingRef.current = billSharing || {
      mode: "manual",
      percentageSplit: { H: 0.5, W: 0.5 },
      sharedBillIds: [],
    };
    setLocalBillSharing(committedBillSharingRef.current);
    // The new values are the source of truth so we're no longer dirty.
    setDirtyBillSharing(false);
  }, [billSharing]);

  // Compute whether the local bill sharing edits differ from the last
  // committed configuration.  Whenever localBillSharing changes, we
  // compare it against the committed ref and update the dirty flag.
  useEffect(() => {
    const base = committedBillSharingRef.current || {
      mode: "manual",
      percentageSplit: { H: 0.5, W: 0.5 },
      sharedBillIds: [],
    };
    const curr = localBillSharing || {
      mode: "manual",
      percentageSplit: { H: 0.5, W: 0.5 },
      sharedBillIds: [],
    };
    const baseH = base.percentageSplit?.H ?? 0.5;
    const baseW = base.percentageSplit?.W ?? 0.5;
    const currH = curr.percentageSplit?.H ?? 0.5;
    const currW = curr.percentageSplit?.W ?? 0.5;
    const isDirty = curr.mode !== base.mode || currH !== baseH || currW !== baseW;
    setDirtyBillSharing(isDirty);
  }, [localBillSharing]);

  // Handle mode changes by updating the local state only.  The dirty flag
  // will be derived automatically by the effect above.
  const handleBillSharingModeChange = (mode) => {
    setLocalBillSharing((prev) => ({ ...prev, mode }));
  };

  // Handle percentage changes for either partner.  Values are clamped
  // between 0 and 100 and stored as decimals (0–1).  The partner
  // counterpart automatically receives the remainder to ensure the
  // percentages always sum to 100%.  The dirty flag is computed
  // automatically.
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
  };

  // Save the current bill sharing configuration.  We update the
  // committed ref and local state to reflect the saved values so
  // subsequent edits are compared against this baseline.  We also
  // include sharedBillIds if present in either the local or base
  // configuration to avoid discarding that property.
  const handleSaveBillSharing = () => {
    if (!onUpdateBillSharing) return;
    const base = committedBillSharingRef.current || {
      mode: "manual",
      percentageSplit: { H: 0.5, W: 0.5 },
      sharedBillIds: [],
    };
    const next = {
      // Preserve the current editing mode
      mode: localBillSharing.mode,
      // Ensure percentage values are valid decimals
      percentageSplit: {
        H: localBillSharing.percentageSplit?.H ?? 0.5,
        W: localBillSharing.percentageSplit?.W ?? 0.5,
      },
      // Carry over any shared bill IDs from either local or base
      sharedBillIds: localBillSharing.sharedBillIds ?? base.sharedBillIds ?? [],
    };
    onUpdateBillSharing(next);
    // Update our committed baseline and local state to reflect the
    // saved configuration so further edits are compared correctly.
    committedBillSharingRef.current = next;
    setLocalBillSharing(next);
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
            <div className="text-xs font-semibold text-slate-900">Settings</div>
            <div className="text-[11px] text-slate-500">Manage your household, accounts, and goals</div>
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
                <div className="text-sm font-semibold text-slate-900">Household & Profile</div>
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
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Your User ID</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">{uid || "(not signed in)"}</div>
                <button type="button" onClick={() => copyToClipboard(uid)} className="text-slate-500 hover:text-slate-700">
                  <Copy size={14} />
                </button>
              </div>
            </div>
            {/* Profile form */}
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-500" htmlFor="household-id">
                  Household ID
                </label>
                <input
                  id="household-id"
                  type="text"
                  className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                  value={localHouseholdId}
                  onChange={(e) => handleProfileChange("householdId", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-500" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                  value={localRole}
                  onChange={(e) => handleProfileChange("role", e.target.value)}
                >
                  <option value="H">Partner H</option>
                  <option value="W">Partner W</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            {dirtyProfile && (
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} /> Save profile
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Plan starting balance */}
        <section className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">Plan starting balance</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-1">
              Set the starting cash balance of your plan. You can change it anytime; we save it to your household profile.
            </p>
            <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
              <label htmlFor="starting-balance" className="text-slate-500">
                Starting balance
              </label>
              <input
                id="starting-balance"
                type="number"
                step="0.01"
                className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                value={localStartingBalance === "" || localStartingBalance == null ? "" : localStartingBalance}
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
                  <CheckCircle2 size={12} /> Save
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
              <div className="text-sm font-semibold text-slate-900">Current Balances (manual)</div>
            </div>
            <Row label="Household total" value={formatMoney(balances.total)} />
            <Row label="Partner H share" value={formatMoney(balances.husband)} />
            <Row label="Partner W share" value={formatMoney(balances.wife)} />
          </Card>
        </section>

        {/* Accounts section */}
        <section className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">Accounts</div>
              </div>
              <button
                type="button"
                onClick={handleAddAccount}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={12} /> Add account
              </button>
            </div>
            {localAccounts.length === 0 && <p className="text-xs text-slate-500">No accounts defined yet.</p>}
            <div className="space-y-3">
              {localAccounts.map((acct) => (
                <div key={acct.id} className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Name</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={acct.name}
                        onChange={(e) => handleAccountChange(acct.id, { name: e.target.value })}
                        placeholder="Account name"
                      />
                    </label>
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Type</span>
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={acct.type}
                        onChange={(e) => handleAccountChange(acct.id, { type: e.target.value })}
                      >
                        <option value="deposit">Deposit</option>
                        <option value="savings">Savings</option>
                      </select>
                    </label>
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Opening balance</span>
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={acct.openingBalance}
                        onChange={(e) =>
                          handleAccountChange(acct.id, {
                            openingBalance: e.target.value === "" ? 0 : parseFloat(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                        onClick={() => handleDeleteAccount(acct.id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Residual account</span>
                <select
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={localResidualId || ""}
                  onChange={(e) => handleResidualChange(e.target.value)}
                >
                  <option value="">None</option>
                  {localAccounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.name}
                    </option>
                  ))}
                </select>
              </div>
              {dirtyAccounts && (
                <button
                  type="button"
                  onClick={handleSaveAccounts}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} /> Save accounts
                </button>
              )}
            </div>

            {/* Bulk import: accounts + bills from CSV template */}
            <BulkImportSpreadsheet onImport={handleBulkImport} />
          </Card>
        </section>

        {/* Allocation rules section */}
        <section className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">Income allocation rules</div>
              </div>
              <button
                type="button"
                onClick={handleAddRule}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={12} /> Add rule
              </button>
            </div>
            {localRules.length === 0 && <p className="text-xs text-slate-500">No rules defined yet.</p>}
            <div className="space-y-3">
              {localRules.map((rule) => (
                <div key={rule.id} className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="grid grid-cols-6 gap-2 items-center">
                    {/* Account selection */}
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Account</span>
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={rule.accountId || ""}
                        onChange={(e) => handleRuleChange(rule.id, { accountId: e.target.value })}
                      >
                        <option value="">Select</option>
                        {localAccounts.map((acct) => (
                          <option key={acct.id} value={acct.id}>
                            {acct.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {/* Type selection */}
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Type</span>
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={rule.type}
                        onChange={(e) => handleRuleChange(rule.id, { type: e.target.value })}
                      >
                        <option value="percent">Percent</option>
                        <option value="amount">Amount</option>
                      </select>
                    </label>
                    {/* Value input */}
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>{rule.type === "percent" ? "Percent" : "Amount"}</span>
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={rule.value}
                        onChange={(e) =>
                          handleRuleChange(rule.id, {
                            value: e.target.value === "" ? "" : parseFloat(e.target.value),
                          })
                        }
                        placeholder={rule.type === "percent" ? "0" : "0.00"}
                      />
                    </label>
                    {/* Frequency selection */}
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Frequency</span>
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={rule.frequency}
                        onChange={(e) => handleRuleChange(rule.id, { frequency: e.target.value })}
                      >
                        <option value="each">Each</option>
                        <option value="first">First</option>
                        <option value="second">Second</option>
                      </select>
                    </label>
                    {/* Label */}
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Label</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={rule.label || ""}
                        onChange={(e) => handleRuleChange(rule.id, { label: e.target.value })}
                        placeholder="Description"
                      />
                    </label>
                    {/* Delete button */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {dirtyRules && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRules}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} /> Save rules
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Household income & pay schedule */}
        <section className="mt-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="text-indigo-500" size={18} />
                <div className="text-sm font-semibold text-slate-900">Household income &amp; pay schedule</div>
              </div>
              {dirtyIncomeSchedule && (
                <button
                  type="button"
                  onClick={handleSaveIncomeSchedule}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <CheckCircle2 size={12} /> Save
                </button>
              )}
            </div>
            <div className="space-y-3 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-slate-500">Partner H income (per paycheque)</div>
                <input
                  type="number"
                  step="0.01"
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  value={localIncome.husband === "" ? "" : localIncome.husband}
                  onChange={(e) => handleIncomeChange("husband", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-slate-500">Partner W income (per paycheque)</div>
                <input
                  type="number"
                  step="0.01"
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  value={localIncome.wife === "" ? "" : localIncome.wife}
                  onChange={(e) => handleIncomeChange("wife", e.target.value)}
                />
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-slate-500">Pay schedule</div>
                  <div className="text-xs font-medium text-slate-700">Semi-monthly</div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-slate-500">First pay date (day)</div>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    value={localSchedule.day1}
                    onChange={(e) => handleScheduleChange("day1", Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-slate-500">Second pay date</div>
                  <select
                    className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    value={localSchedule.day2}
                    onChange={(e) => handleScheduleChange("day2", e.target.value)}
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
                <div className="text-sm font-semibold text-slate-900">Household bill sharing</div>
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
              </div>
              {localBillSharing.mode === "percentage" && (
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex flex-col text-[10px] text-slate-500">
                    <span>Partner H share (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                      value={Math.round((localBillSharing.percentageSplit.H ?? 0.5) * 100)}
                      onChange={(e) => handleBillSharingPercentageChange("H", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col text-[10px] text-slate-500">
                    <span>Partner W share (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                      value={Math.round((localBillSharing.percentageSplit.W ?? 0.5) * 100)}
                      onChange={(e) => handleBillSharingPercentageChange("W", e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
            {dirtyBillSharing && (
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveBillSharing}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} /> Save bill sharing
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
                <div className="text-sm font-semibold text-slate-900">Goals</div>
              </div>
              <button
                type="button"
                onClick={handleAddGoal}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={12} /> Add goal
              </button>
            </div>
            {localGoals.length === 0 && <p className="text-xs text-slate-500">No goals defined yet.</p>}
            <div className="space-y-3">
              {localGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 space-y-2"
                >
                  {/* First row: name, target amount, contribution/perMonth display and delete */}
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Name</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={goal.name}
                        onChange={(e) => handleGoalChange(goal.id, { name: e.target.value })}
                        placeholder="Goal name"
                      />
                    </label>
                    <label className="flex flex-col text-[10px] text-slate-500">
                      <span>Target amount</span>
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={goal.targetAmount}
                        onChange={(e) =>
                          handleGoalChange(goal.id, {
                            targetAmount:
                              e.target.value === '' ? 0 : parseFloat(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                    {goal.scope === 'personal' ? (
                      <label className="flex flex-col text-[10px] text-slate-500">
                        <span>Monthly contribution</span>
                        <input
                          type="number"
                          step="0.01"
                          className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                          value={goal.perMonth}
                          onChange={(e) => handleGoalPerMonthChange(goal.id, e.target.value)}
                          placeholder="0.00"
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col text-[10px] text-slate-500">
                        <span>Monthly total</span>
                        <span className="text-[11px] text-slate-800">
                          {goal.perMonth ?? 0}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-end space-x-1">
                      {/* Show accept/reject for pending goals when applicable */}
                      {goal.status === 'pending' && goal.pendingFor === localRole ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGoalApproval(goal.id, 'accept')}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGoalApproval(goal.id, 'reject')}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-rose-700"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                  {/* Second row: scope selector and partner contributions if shared */}
                  <div className="grid grid-cols-6 gap-2 items-center">
                    <label className="flex flex-col text-[10px] text-slate-500 col-span-2">
                      <span>Scope</span>
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={goal.scope}
                        onChange={(e) => handleGoalScopeChange(goal.id, e.target.value)}
                      >
                        <option value="personal">Personal</option>
                        <option value="shared">Shared</option>
                      </select>
                    </label>
                    {goal.scope === 'shared' && (
                      <>
                        <label className="flex flex-col text-[10px] text-slate-500">
                          <span>Partner H share</span>
                          <input
                            type="number"
                            step="0.01"
                            className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                            value={goal.contributions?.H ?? 0}
                            onChange={(e) =>
                              handleGoalContributionChange(goal.id, 'H', e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </label>
                        <label className="flex flex-col text-[10px] text-slate-500">
                          <span>Partner W share</span>
                          <input
                            type="number"
                            step="0.01"
                            className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                            value={goal.contributions?.W ?? 0}
                            onChange={(e) =>
                              handleGoalContributionChange(goal.id, 'W', e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </label>
                      </>
                    )}
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
                  <CheckCircle2 size={12} /> Save goals
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
                <div className="text-sm font-semibold text-slate-900">Budgets</div>
              </div>
              <button
                type="button"
                onClick={handleAddBudgetCategory}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={12} /> Add category
              </button>
            </div>
            {budgetsArray.length === 0 && <p className="text-xs text-slate-500">No budget categories defined yet.</p>}
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
                        onChange={(e) => handleBudgetChange(key, { label: e.target.value })}
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
                            amount: e.target.value === "" ? "" : parseFloat(e.target.value),
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
                        <Trash2 size={12} /> Delete
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
                  <CheckCircle2 size={12} /> Save budgets
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