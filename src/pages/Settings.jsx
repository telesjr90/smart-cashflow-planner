// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Settings as SettingsIcon } from "lucide-react";
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
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

// Preset categories for budgets. These defaults are loaded when a new household
// has no budgets defined yet. Users can rename, add, or delete categories.
// Scope defaults to "shared" and no owner/account attached.
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
  onDirtyChange,
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

  const handleStartingBalanceChange = (value) => {
    setLocalStartingBalance(value === "" ? "" : parseFloat(value));
    setDirtyStartingBalance(true);
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
      const opening =
        isFirst
          ? (localStartingBalance === "" || localStartingBalance == null
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
          // Ownership metadata
          ownerRole: localRole, // "H" | "W" | "other"
          ownerUid: uid || null, // from Settings props
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
    const accountIdByName = new Map(allAccounts.map((a) => [a.name.toLowerCase(), a.id]));

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
    const defaultAccount =
      (localAccounts && localAccounts[0] && localAccounts[0].id) || localResidualId || "";
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
    setLocalIncome({ husband: income?.husband ?? 0, wife: income?.wife ?? 0 });
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
      day2:
        localSchedule.day2 === "" || localSchedule.day2 === "last"
          ? "last"
          : Number(localSchedule.day2) || "last",
    };
    onUpdateIncomeAndPaySchedule(cleanedIncome, cleanedSchedule);
    setDirtyIncomeSchedule(false);
  };

  // ---------- Goals local state ----------

  // Helper to normalize goals to include shared fields plus new owner/timeline/account with defaults.
  const normalizeGoal = (goal) => {
    const baseScope = goal.scope || "personal";
    const computedOwner =
      goal.owner ??
      (baseScope === "personal"
        ? goal.createdBy || role || "H"
        : null);

    return {
      scope: baseScope,
      status: goal.status || "active",
      pendingFor: goal.pendingFor ?? null,
      createdBy: goal.createdBy || role || "H",
      contributions: goal.contributions || {},
      owner: computedOwner, // "H" | "W" | null
      startDate: goal.startDate || "", // YYYY-MM-DD
      endDate: goal.endDate || "", // YYYY-MM-DD
      accountId: goal.accountId || null,
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
    // When adding a new goal we include the shared goal fields with sensible defaults,
    // plus new owner/timeline/account fields.
    const newGoal = normalizeGoal({
      id: `goal-${Date.now()}`,
      name: "New goal",
      targetAmount: 0,
      perMonth: 0,
      savedSoFar: 0,
      scope: "personal",
      status: "active",
      pendingFor: null,
      createdBy: role || "H",
      contributions: {},
      owner: role || "H",
      startDate: "",
      endDate: "",
      accountId: null,
    });
    setLocalGoals((prev) => [...prev, newGoal]);
    setDirtyGoals(true);
  };

  const handleGoalChange = (id, updates) => {
    // Generic field updater for goals. Does not manage scope or contributions
    // (those have specialized helpers).
    setLocalGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
    setDirtyGoals(true);
  };

  // Update the goal's scope (personal/shared). When switching to shared,
  // initialize contributions if missing and derive perMonth from the sum.
  // When switching to personal, ensure an owner is set.
  const handleGoalScopeChange = (id, scope) => {
    setLocalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const updated = { ...goal, scope };
        if (scope === "personal") {
          // Personal goals do not use partner contributions breakdown.
          updated.contributions = {};
          // Ensure an owner is set; default to the current user role.
          updated.owner = goal.owner || role || "H";
          // perMonth remains user editable for personal goals.
        } else if (scope === "shared") {
          // Shared goals: ensure contributions object exists and derive perMonth
          // from partners' contributions.
          const H = updated.contributions?.H ?? 0;
          const W = updated.contributions?.W ?? 0;
          updated.contributions = { H, W };
          updated.perMonth = parseFloat(H || 0) + parseFloat(W || 0);
          updated.owner = null; // shared goals have no single owner
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

  // Filter which goals are visible to the current user, enforcing:
  // - Show all shared goals
  // - Show only personal goals owned by this partner
  // - If role is "other"/unknown, show everything to avoid locking out admins
  const visibleGoals = useMemo(() => {
    if (localRole !== "H" && localRole !== "W") {
      return localGoals;
    }
    return localGoals.filter((goal) => {
      const scope = goal.scope || "personal";
      if (scope === "shared") return true;
      // personal
      if (!goal.owner) return true; // legacy goals without owner visible for safety
      return goal.owner === localRole;
    });
  }, [localGoals, localRole]);

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
    setLocalBudgets(
      Object.keys(cats).length === 0 ? DEFAULT_BUDGET_CATEGORIES : cats
    );
  }, [categoryBudgets]);

  const handleAddBudgetCategory = () => {
    const newKey = `category-${Date.now()}`;
    setLocalBudgets((prev) => ({
      ...prev,
      [newKey]: {
        label: "New category",
        amount: 0,
        scope: "personal",
        owner: localRole === "H" || localRole === "W" ? localRole : "H",
        accountId: null,
      },
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

  // Derived arrays for display
  const budgetsArray = useMemo(
    () =>
      Object.entries(localBudgets).map(([key, cfg]) => {
        const {
          label = key,
          amount = 0,
          scope = "shared",
          owner = null,
          accountId = null,
        } = cfg || {};
        return {
          key,
          label,
          amount,
          scope,
          owner,
          accountId,
        };
      }),
    [localBudgets]
  );

  // Apply visibility rules:
  // - Show shared budgets to both partners
  // - Show personal budgets only to the owning partner
  // - If role is "other"/unknown, show all
  const visibleBudgets = useMemo(() => {
    if (localRole !== "H" && localRole !== "W") {
      return budgetsArray;
    }
    return budgetsArray.filter(({ scope, owner }) => {
      const effScope = scope || "shared";
      if (effScope === "shared") return true;
      // personal
      if (!owner) return true; // legacy budgets without owner visible so they can be cleaned up
      return owner === localRole;
    });
  }, [budgetsArray, localRole]);

  // ---------- Bill sharing local state ----------
  // Keep track of the last committed bill sharing configuration. This
  // ref is updated whenever the parent prop changes or after a save. It
  // is used to determine whether local edits are "dirty" relative to
  // the most recently saved state rather than depending on the parent
  // prop update timing.
  const committedBillSharingRef = useRef(billSharing);

  // Ensure the local editable state always contains the same shape as
  // the billSharing prop, including sharedBillIds so that missing keys
  // don't inadvertently mark the config as dirty. Default to a
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
  // committed configuration. Whenever localBillSharing changes, we
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

  // Track overall dirty state and notify parent when it changes
  const [isDirty, setIsDirty] = useState(false);

  // Compute whether any settings section is dirty
  useEffect(() => {
    const combinedDirty =
      dirtyStartingBalance ||
      dirtyProfile ||
      dirtyAccounts ||
      dirtyRules ||
      dirtyIncomeSchedule ||
      dirtyGoals ||
      dirtyBudgets ||
      dirtyBillSharing;
    setIsDirty(combinedDirty);
  }, [
    dirtyStartingBalance,
    dirtyProfile,
    dirtyAccounts,
    dirtyRules,
    dirtyIncomeSchedule,
    dirtyGoals,
    dirtyBudgets,
    dirtyBillSharing,
  ]);

  // Propagate dirty state to parent via callback
  useEffect(() => {
    if (typeof onDirtyChange === "function") {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Handle mode changes by updating the local state only. The dirty flag
  // will be derived automatically by the effect above.
  const handleBillSharingModeChange = (mode) => {
    setLocalBillSharing((prev) => ({ ...prev, mode }));
  };

  // Handle percentage changes for either partner. Values are clamped
  // between 0 and 100 and stored as decimals (0–1). The partner
  // counterpart automatically receives the remainder to ensure the
  // percentages always sum to 100%. The dirty flag is computed
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

  // Save the current bill sharing configuration. We update the
  // committed ref and local state to reflect the saved values so
  // subsequent edits are compared against this baseline. We also
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
            <div className="text-[11px] text-slate-500">
              Manage your household, accounts, and goals
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 pt-3 pb-20 space-y-4 max-w-md mx-auto">
        {/* Household & Profile */}
        <ProfileForm
          uid={uid}
          householdCount={householdCount}
          localHouseholdId={localHouseholdId}
          localRole={localRole}
          dirtyProfile={dirtyProfile}
          onProfileChange={handleProfileChange}
          onSaveProfile={handleSaveProfile}
        />

        {/* Plan starting balance */}
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

        {/* Balances summary */}
        <section className="mt-4">
          <Card className="p-4">
            <BalancesSummaryCard
              total={formatMoney(balances.total)}
              husband={formatMoney(balances.husband)}
              wife={formatMoney(balances.wife)}
            />
          </Card>
        </section>

        {/* Accounts section */}
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

        {/* Allocation rules section */}
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

        {/* Household income & pay schedule */}
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

        {/* Household bill sharing */}
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

        {/* Goals section */}
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

        {/* Budgets section */}
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

        {/* Note: Accounts, Allocation Rules, and Income & Schedule sections remain unchanged and appear above. */}
      </section>
    </div>
  );
}
