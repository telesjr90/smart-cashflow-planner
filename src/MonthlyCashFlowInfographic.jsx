// src/MonthlyCashFlowInfographic.jsx

// Updated to fix starting balance + actual mode wiring
// Updated in Step 4 – Dashboard starting balances from real data
//
// This component renders the monthly cash-flow “infographic” dashboard.  It
// builds on the upstream implementation and adds logic for shared goal
// contributions, mode toggling and interactive discretionary balances.  In
// addition to using the first-month net from the cashflow engine, we now
// subtract any goal contributions when computing the end-of-month balance
// and the available discretionary cash.  See QA bug #3 for details.

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Wallet, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  projectCashflow,
  fromCents,
  getMonthIndexFromStart,
  normalizeCashflowMode,
  DEFAULT_CASHFLOW_MODE,
} from "./lib/cashflow/index.js";
import { getDefaultPlannerStartDate } from "./lib/cashflow/index.js";
import { safeLocalStorage, makeScopedKey } from "./lib/safeLocalStorage";
import { useToast } from "./components/ui/toast/useToast";
import { useCashflowStore } from "./store/useCashflowStore";
import {
  getScopedBillAmount,
  isBillVisibleInSelfScope,
} from "./lib/billSharing";

const LOCAL_STORAGE_BASE_KEY = "cashFlowData";

// Default target split for auto-assigned bills
const TARGET_H_SHARE = 0.51;
const TARGET_W_SHARE = 0.49;

const DEFAULT_START_DATE = getDefaultPlannerStartDate();
const DEFAULT_STARTING_BALANCE = 0;

const clampNumber = (n) => (Number.isFinite(n) ? n : 0);
const fmt = (v) =>
  `$${Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Helper to sum opening balances from account objects.
// Falls back to a provided starting balance if no accounts exist.
function sumOpeningBalance(accounts, fallbackStartingBalance = 0) {
  if (Array.isArray(accounts) && accounts.length) {
    return accounts.reduce(
      (sum, acc) => sum + clampNumber(acc?.openingBalance ?? 0),
      0
    );
  }
  const fb = Number(fallbackStartingBalance || 0);
  return Number.isFinite(fb) ? fb : 0;
}

// No sample bills initially; live bills will overwrite this array
const initialBills = [];

/**
 * Distribute unassigned bills between partners to approximate a target split.
 * Bills explicitly assigned to a payer remain fixed; unassigned bills are
 * distributed by brute force search over all possible assignments.  This
 * helper originates from the upstream code and is unchanged here.
 */
function autoAssignBills(allBills) {
  const fixedH = [],
    fixedW = [],
    unassigned = [];
  allBills.forEach((b) =>
    (b.payer === "H"
      ? fixedH
      : b.payer === "W"
      ? fixedW
      : unassigned
    ).push({
      ...b,
    })
  );

  const total = allBills.reduce((s, b) => s + b.amount, 0);
  if (!unassigned.length || total <= 0) return allBills;
  const sumFixedH = fixedH.reduce((s, b) => s + b.amount, 0);
  const n = unassigned.length;
  let bestMask = 0,
    bestScore = Infinity,
    bestDollarDiff = Infinity;
  for (let mask = 0; mask < 1 << n; mask++) {
    let h = sumFixedH;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) h += unassigned[i].amount;
    }
    const share = h / total;
    const score = Math.abs(share - TARGET_H_SHARE);
    const dollarDiff = Math.abs(h - total * TARGET_H_SHARE);
    if (
      score < bestScore ||
      (score === bestScore && dollarDiff < bestDollarDiff)
    ) {
      bestScore = score;
      bestDollarDiff = dollarDiff;
      bestMask = mask;
    }
  }
  const autoH = [],
    autoW = [];
  unassigned.forEach((b, i) =>
    (bestMask & (1 << i) ? autoH : autoW).push(b)
  );
  return [...fixedH, ...fixedW, ...autoH, ...autoW];
}

const GOAL_STATUS_ACTIVE = "active";
const GOAL_STATUS_PENDING = "pending";
const GOAL_STATUS_REJECTED = "rejected";

// Helper to normalize goals array with default status
function normalizeGoals(goals = []) {
  return goals.map((g) => ({
    ...g,
    status: g.status || GOAL_STATUS_ACTIVE,
  }));
}

// Filter out pending/rejected goals
function filterActiveGoals(goals = []) {
  return normalizeGoals(goals).filter((g) => g.status === GOAL_STATUS_ACTIVE);
}

// Compute partner-specific and household goal contributions per month
function computeGoalContributions(goals = []) {
  const activeGoals = filterActiveGoals(goals);

  const contributions = {
    H: 0,
    W: 0,
    household: 0,
  };

  activeGoals.forEach((goal) => {
    if (goal.includeInDiscretionary === false) return;

    const perMonth = clampNumber(goal.perMonth || goal.monthlyAmount || 0);
    if (!perMonth) return;

    const owner = goal.owner || goal.payer || "H";
    const scope = goal.scope || "shared"; // "shared" | "personal"

    if (scope === "shared") {
      contributions.household += perMonth;
    } else {
      // Personal goal; allocate entirely to owner
      if (owner === "W") contributions.W += perMonth;
      else contributions.H += perMonth;
    }
  });

  return contributions;
}

function pickFirstDefined(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
      return { key: k, value: obj[k] };
    }
  }
  return { key: null, value: undefined };
}

function coerceNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/**
 * Normalize a currency-like field that may be provided in cents or dollars.
 *
 * We prefer explicit "*Cents" keys when available. Otherwise, we choose the
 * safest interpretation using a small heuristic against the month total so we
 * don't double-convert dollar values or show absurdly large "dollar" numbers.
 */
function normalizeCurrencyField(obj, candidateKeys, monthTotalDollars) {
  const { key, value } = pickFirstDefined(obj, candidateKeys);
  const raw = coerceNumber(value);
  if (!Number.isFinite(raw)) return 0;

  const keySuggestsCents = !!key && /cents/i.test(String(key));
  if (keySuggestsCents) {
    // Short-circuit: keys ending with "Cents" are already cents; avoid reinterpreting.
    return Number(fromCents(raw));
  }

  // If it has decimals, it's almost certainly already dollars.
  if (!Number.isInteger(raw)) return raw;

  const dollars = raw;
  const centsAsDollars = Number(fromCents(raw));

  // If we have a usable month total, pick the interpretation that isn't wildly larger.
  if (Number.isFinite(monthTotalDollars) && monthTotalDollars > 0) {
    const maxReasonable = monthTotalDollars * 1.25;
    const dollarsPlausible = Math.abs(dollars) <= maxReasonable;
    const centsPlausible = Math.abs(centsAsDollars) <= maxReasonable;

    if (centsPlausible && !dollarsPlausible) return centsAsDollars;
    if (dollarsPlausible && !centsPlausible) return dollars;

    // If both (or neither) are plausible, pick the smaller magnitude to avoid huge misreads.
    return Math.abs(centsAsDollars) < Math.abs(dollars) ? centsAsDollars : dollars;
  }

  // No month context: fall back to a conservative heuristic.
  // Integers >= 10,000 are very often cents (>= $100.00).
  if (Math.abs(raw) >= 10000) return centsAsDollars;
  return dollars;
}

// Reducer to take raw engine results and produce infographic-friendly rows.
function buildWeeklyView({ monthlySummary, ledger = [], startDate }) {
  if (!monthlySummary || !monthlySummary.length)
    return {
      weeks: [],
      summary: {
        income: 0,
        bills: 0,
        goals: 0,
        expenses: 0,
        net: 0,
        startBalance: 0,
        endBalance: 0,
      },
    };

  // Pick the month aligned to "today" so the weekly view matches the visible plan window.
  const todayISO = new Date().toISOString().slice(0, 10);
  const targetMonthIndex = (() => {
    if (!startDate) return 0;
    const idx = getMonthIndexFromStart(startDate, todayISO);
    if (!Number.isFinite(idx)) return 0;
    return Math.max(0, Math.min(monthlySummary.length - 1, idx));
  })();

  const firstMonth = monthlySummary[targetMonthIndex] || monthlySummary[0];
  const base = {
    income: Number(fromCents(firstMonth.totalIncome)),
    bills: Number(fromCents(firstMonth.totalBills)),
    goals: Number(fromCents(firstMonth.totalGoals || 0)),
    expenses: Number(fromCents(firstMonth.totalExpenses || 0)),
    net: Number(fromCents(firstMonth.net)),
    startBalance: Number(
      fromCents(firstMonth.startBalanceCents || firstMonth.startBalance || 0)
    ),
    endBalance: Number(fromCents(firstMonth.endBalanceCents || firstMonth.endBalance || 0)),
  };

  // NOTE: We intentionally avoid rendering "fake" weeks (e.g., Weeks 1–5 of $0.00)
  // when the engine provides no weekly breakdown. Showing fabricated rows looks like
  // real data and confuses users, so an empty-state is preferable.
  const rawWeeks = firstMonth.weeks;
  let weeksArray = [];

  if (Array.isArray(rawWeeks)) {
    weeksArray = rawWeeks;
  } else if (rawWeeks && typeof rawWeeks === "object") {
    // Some engines/data sources may return an object keyed by week.
    weeksArray = Object.values(rawWeeks);
  }

  // If the engine omitted weekly buckets, rebuild them from the ledger for the target month.
  if (!weeksArray.length && Array.isArray(ledger) && ledger.length) {
    const buckets = new Map();
    ledger
      .filter((entry) => Number(entry?.monthIndex) === targetMonthIndex)
      .forEach((entry) => {
        const day = Number(String(entry.date || "").slice(8, 10));
        if (!Number.isFinite(day) || day <= 0) return;
        const weekIndex = Math.min(5, Math.max(1, Math.floor((day - 1) / 7) + 1));
        if (!buckets.has(weekIndex)) {
          buckets.set(weekIndex, {
            weekIndex,
            incomeCents: 0,
            billsCents: 0,
            expenseCents: 0,
            expensesCents: 0,
            goalCents: 0,
            netCents: 0,
            startBalanceCents: entry.startBalanceCents ?? null,
            endBalanceCents: entry.endBalanceCents ?? null,
          });
        }
        const bucket = buckets.get(weekIndex);
        if (bucket.startBalanceCents == null && entry.startBalanceCents != null) {
          bucket.startBalanceCents = entry.startBalanceCents;
        }
        bucket.netCents += Number(entry.delta || 0);
        if (entry.delta > 0) {
          bucket.incomeCents += Number(entry.delta || 0);
        } else if (entry.delta < 0) {
          if (entry.kind === "expense") {
            bucket.expenseCents += -Number(entry.delta || 0);
            bucket.expensesCents += -Number(entry.delta || 0);
          } else {
            bucket.billsCents += -Number(entry.delta || 0);
          }
        }
        if (entry.endBalanceCents != null) {
          bucket.endBalanceCents = entry.endBalanceCents;
        }
      });

    weeksArray = Array.from(buckets.values()).filter(
      (w) =>
        (w.incomeCents || 0) !== 0 ||
        (w.billsCents || 0) !== 0 ||
        (w.expensesCents || 0) !== 0 ||
        (w.netCents || 0) !== 0
    );
  }

  weeksArray = weeksArray.filter(Boolean);
  if (!weeksArray.length) {
    return {
      weeks: [],
      summary: base,
    };
  }

  // Prefer the engine's own week index/number when provided, so calendar weeks don't "shift"
  // when some weeks are missing from the engine output.
  const getProvidedWeekNumber = (w) =>
    coerceNumber(w?.weekIndex ?? w?.weekNumber ?? w?.week ?? w?.weekNum);

  const sortedWeeks = weeksArray
    .map((w, idx) => ({ ...w, __idx: idx }))
    .sort((a, b) => {
      const aNum = getProvidedWeekNumber(a);
      const bNum = getProvidedWeekNumber(b);

      const aHas = Number.isFinite(aNum);
      const bHas = Number.isFinite(bNum);

      // Primary: numeric week identifier (weekIndex first, then weekNumber/week/weekNum)
      if (aHas && bHas) return aNum - bNum;
      if (aHas) return -1;
      if (bHas) return 1;

      // Fallback: stable original order
      return (a.__idx ?? 0) - (b.__idx ?? 0);
    });

  let runningBalance = base.startBalance;

  const resultWeeks = sortedWeeks.map((original, i) => {
    const provided = getProvidedWeekNumber(original);
    const displayWeekNumber = Number.isFinite(provided) ? provided : i + 1;

    const income = normalizeCurrencyField(
      original,
      ["incomeCents", "totalIncomeCents", "income", "totalIncome"],
      base.income
    );

    const bills = normalizeCurrencyField(
      original,
      [
        "billCents",
        "billsCents",
        "totalBillsCents",
        "bills",
        "totalBills",
        "bill",
        "totalBill",
      ],
      base.bills
    );

    const goals = normalizeCurrencyField(
      original,
      ["goalCents", "goalsCents", "totalGoalsCents", "goals", "totalGoals"],
      base.goals
    );

    const expenses = normalizeCurrencyField(
      original,
      [
        "expenseCents",
        "expensesCents",
        "totalExpensesCents",
        "expenses",
        "totalExpenses",
      ],
      base.expenses
    );

    const startBalance = normalizeCurrencyField(
      original,
      ["startBalanceCents", "startBalance"],
      runningBalance
    );

    const netFromField = normalizeCurrencyField(
      original,
      ["netCents", "net", "totalNetCents", "totalNet"],
      base.net
    );

    const hasExplicitNet = (() => {
      const found = pickFirstDefined(original, [
        "netCents",
        "net",
        "totalNetCents",
        "totalNet",
      ]);
      return found.key != null && found.value != null;
    })();

    const net = hasExplicitNet ? netFromField : income - bills - goals - expenses;
    const endBalance = normalizeCurrencyField(
      original,
      ["endBalanceCents", "endBalance"],
      startBalance + net
    );

    runningBalance = endBalance;

    return {
      ...original,
      weekNumber: displayWeekNumber,
      label: `Week ${displayWeekNumber}`,
      income,
      bills,
      goals,
      expenses,
      startBalance,
      endBalance,
      net,
    };
  });

  const finalEndBalance =
    normalizeCurrencyField(firstMonth, ["endBalanceCents", "endBalance"], runningBalance) ||
    runningBalance;

  return {
    weeks: resultWeeks,
    summary: {
      ...base,
      endBalance: finalEndBalance,
    },
  };
}

// Exported for testing
export { buildWeeklyView };

const USE_FS_FOR_PLANNING = true;

function useDebouncedCallback(callback, delayMs) {
  const timerRef = useRef(null);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delayMs);
    },
    [callback, delayMs]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return debounced;
}

export default function MonthlyCashFlowInfographic(props = {}) {
  // Props from App (optional)
  const {
    uid: uidProp,
    householdId,
    paidBills: paidBillsProp,
    setPaidBills: setPaidBillsProp,
    confirmedDiscretionary: confirmedDiscretionaryProp,
    setConfirmedDiscretionary: setConfirmedDiscretionaryProp,
    mergeWrite: mergeWriteProp,
    personScope = "self", // Default to self view if not provided
    lockedPersonScope,
    role = "H",
    // live data from App / myData
    liveStartDate,
    liveIncome,
    livePaySchedule,
    liveBills,
    // Optional: live accounts & starting balance from core app
    liveAccounts,
    liveStartingBalance,
    liveAllocationRules,
    // Phase 3 props
    liveExtraIncomes,
    onUpdateExtraIncomes, // (not used here yet, but kept for compatibility)
    // Phase 4 props: goals & budgets (read-only here)
    liveGoals,
    liveCategoryBudgets,
    // Mode control props (optional)
    mode: modeProp,
    setMode: setModeProp,
    // NEW: live expenses + residual account from App
    liveExpenses,
    residualAccountId: residualAccountIdProp,
    months: monthsProp,
  } = props;

  const { showToast } = useToast();
  const setConfirmedDiscretionaryStore = useCashflowStore(
    (state) => state.setConfirmedDiscretionary
  );
  const billSharing = useCashflowStore((state) => state.billSharing);

  // Planning state (kept mostly for persistence / FS mirror,
  // but starting balance is now driven from liveAccounts/liveStartingBalance).
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [startingBalance, setStartingBalance] = useState(
    DEFAULT_STARTING_BALANCE
  );

  // Partner incomes default to zero until provided via live props or user input
  const [hIncome, setHIncome] = useState(0);
  const [wIncome, setWIncome] = useState(0);
  const [extraIncomes, setExtraIncomes] = useState([]);
  // Local copy of bills.  Start empty; populated from liveBills when provided.
  const [bills, setBills] = useState(initialBills);
  // Category budgets and goals
  const [categoryBudgets, setCategoryBudgets] = useState({});
  // Minimum discretionary thresholds per partner
  const [minDiscretionary, setMinDiscretionary] = useState({
    husband: 0,
    wife: 0,
  });
  const [goals, setGoals] = useState([]);

  // Sync extra incomes with live prop when provided (Phase 3)
  useEffect(() => {
    if (liveExtraIncomes) {
      setExtraIncomes(liveExtraIncomes);
    }
  }, [liveExtraIncomes]);

  // Sync goals with live prop when provided
  useEffect(() => {
    if (Array.isArray(liveGoals)) {
      setGoals(liveGoals);
    }
  }, [liveGoals]);

  // Sync category budgets with live prop when provided
  useEffect(() => {
    if (liveCategoryBudgets) {
      setCategoryBudgets(liveCategoryBudgets);
    }
  }, [liveCategoryBudgets]);

  // Sync start date with liveStartDate
  useEffect(() => {
    if (liveStartDate) {
      setStartDate(liveStartDate);
    }
  }, [liveStartDate]);

  // Respect locked scope from callers (e.g., Planner) to avoid drift.
  const effectivePersonScope = lockedPersonScope || personScope || "self";

  // Projection window: allow caller override, otherwise cover through current month (min 6).
  const projectionMonths = useMemo(() => {
    if (typeof monthsProp === "number" && monthsProp > 0) return monthsProp;
    if (!startDate) return 6;
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthIndex = getMonthIndexFromStart(startDate, todayStr);
    return Math.max(6, monthIndex + 1);
  }, [monthsProp, startDate]);

  // Sync incomes with liveIncome
  useEffect(() => {
    if (liveIncome && typeof liveIncome === "object") {
      if (typeof liveIncome.husband === "number") {
        setHIncome(liveIncome.husband);
      }
      if (typeof liveIncome.wife === "number") {
        setWIncome(liveIncome.wife);
      }
    }
  }, [liveIncome]);

  // liveBills → local bills (respect empty = clear)
  useEffect(() => {
    if (!Array.isArray(liveBills)) return;
    if (liveBills.length === 0) {
      setBills([]);
      return;
    }
    setBills((prev) => {
      const prevById = Object.fromEntries(prev.map((b) => [b.id, b]));
      return liveBills.map((b, idx) => {
        const id = b.id || `b${idx}`;
        const existing = prevById[id];
        return {
          id,
          name: b.name || existing?.name || "",
          amount:
            typeof b.amount === "number"
              ? b.amount
              : Number(b.amount || existing?.amount || 0),
          dueDay: b.dueDay != null ? b.dueDay : existing?.dueDay || 1,
          payer: b.payer || existing?.payer || "AUTO",
          category: b.category || existing?.category || "other",
          paid: existing?.paid || false,
        };
      });
    });
  }, [liveBills]);

  // Mode & UI state
  const [internalMode, setInternalMode] = useState(DEFAULT_CASHFLOW_MODE);
  const rawMode = modeProp || internalMode;
  const mode = normalizeCashflowMode(rawMode) || DEFAULT_CASHFLOW_MODE;
  const setMode = setModeProp || setInternalMode;
  const engineMode = mode === "actual" ? "actual" : "planned";

  // Persisted non-planning state: paidBills & confirmedDiscretionary
  const [paidBillsLocal, setPaidBillsLocal] = useState({});
  const [confirmedDiscretionaryLocal, setConfirmedDiscretionaryLocal] =
    useState({});

  const usePropFacts = !!(
    paidBillsProp &&
    setPaidBillsProp &&
    confirmedDiscretionaryProp &&
    setConfirmedDiscretionaryProp
  );
  const confirmedDiscretionary = usePropFacts
    ? confirmedDiscretionaryProp
    : confirmedDiscretionaryLocal;
  const setConfirmedDiscretionary = usePropFacts
    ? setConfirmedDiscretionaryProp
    : setConfirmedDiscretionaryLocal;
  const paidBills = usePropFacts ? paidBillsProp : paidBillsLocal;
  const setPaidBills = usePropFacts ? setPaidBillsProp : setPaidBillsLocal;
  const scopeKey =
    effectivePersonScope === "both" ? "household" : role === "W" ? "W" : "H";
  const confirmedForScope = confirmedDiscretionary?.[scopeKey];

  // Firestore infra
  const uid = uidProp || auth.currentUser?.uid || null;
  const userDocRef = uid ? doc(db, "users", uid) : null;
  const fsDebounceRef = useRef(null);
  const [fsError, setFsError] = useState(null);

  // Scope planner persistence by household (preferred) or user.
  const storageKey = useMemo(
    () => makeScopedKey(LOCAL_STORAGE_BASE_KEY, { householdId, uid }),
    [householdId, uid]
  );

  const internalMergeWrite = useCallback(
    async (payload) => {
      if (!userDocRef || !payload || typeof payload !== "object") return;
      const update = {};
      Object.entries(payload).forEach(([key, value]) => {
        update[`data.cashflowInfographic.${key}`] = value;
      });
      try {
        if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
        fsDebounceRef.current = setTimeout(async () => {
          await setDoc(userDocRef, update, { merge: true });
        }, 400);
      } catch (e) {
        console.warn("Firestore mergeWrite failed", e);
      }
    },
    [userDocRef]
  );
  const mergeWrite = mergeWriteProp || internalMergeWrite;

  // LocalStorage bootstrap
  useEffect(() => {
    if (!storageKey) return; // no scoped key => skip persistence to avoid bleed
    try {
      const raw = safeLocalStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : {};
      if (saved.startDate) setStartDate(saved.startDate);
      if (typeof saved.startingBalance === "number")
        setStartingBalance(saved.startingBalance);
      if (saved.hIncome) setHIncome(saved.hIncome);
      if (saved.wIncome) setWIncome(saved.wIncome);
      if (saved.bills) setBills(saved.bills);
      if (!liveExtraIncomes && saved.extraIncomes)
        setExtraIncomes(saved.extraIncomes);
      if (Array.isArray(saved.goals)) setGoals(saved.goals);
      if (saved.categoryBudgets) setCategoryBudgets(saved.categoryBudgets);
      if (saved.cashFlowMode) {
        setInternalMode(
          normalizeCashflowMode(saved.cashFlowMode) || DEFAULT_CASHFLOW_MODE
        );
      }
    } catch (e) {
      console.warn(
        "[MonthlyCashFlowInfographic] load from localStorage failed",
        e
      );
    }
  }, [storageKey, liveExtraIncomes]);

  // Firestore load
  const overlayPlanningFromFs = useCallback(
    (data) => {
      if (!data) return;
      if (!liveStartDate && data.startDate) setStartDate(data.startDate);
      if (typeof data.startingBalance === "number")
        setStartingBalance(data.startingBalance);
      if (!liveBills && Array.isArray(data.bills)) setBills(data.bills);
      if (!liveExtraIncomes && Array.isArray(data.extraIncomes))
        setExtraIncomes(data.extraIncomes);
      if (!liveIncome && typeof data.hIncome === "number")
        setHIncome(data.hIncome);
      if (!liveIncome && typeof data.wIncome === "number")
        setWIncome(data.wIncome);
      if (Array.isArray(data.goals)) setGoals(data.goals);
      if (data.categoryBudgets) setCategoryBudgets(data.categoryBudgets);
    },
    [liveStartDate, liveBills, liveIncome, liveExtraIncomes]
  );

  const loadFsFacts = useCallback(async () => {
    if (usePropFacts || !userDocRef) return;
    setFsError(null);
    try {
      const snap = await getDoc(userDocRef);
      const root = snap.exists() ? snap.data()?.data || {} : {};
      const data = root.cashflowInfographic || root;
      setPaidBillsLocal(data.paidBills || {});
      setConfirmedDiscretionaryLocal(data.confirmedDiscretionary || {});
      if (USE_FS_FOR_PLANNING) overlayPlanningFromFs(data);
    } catch (err) {
      console.warn("Firestore load failed", err);
      setFsError("Unable to load latest data. Working locally.");
    }
  }, [userDocRef, usePropFacts, overlayPlanningFromFs]);

  useEffect(() => {
    loadFsFacts();
  }, [loadFsFacts]);

  // Persist planning to localStorage
  useEffect(() => {
    if (!storageKey) return; // no scoped key => keep this as in-memory only
    const toSave = {
      startDate,
      startingBalance,
      hIncome,
      wIncome,
      bills,
      extraIncomes,
      minDiscretionary,
      goals,
      categoryBudgets,
      cashFlowMode: mode,
    };
    try {
      safeLocalStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (e) {
      // JSON.stringify itself can theoretically throw; be defensive.
      console.warn(
        "[MonthlyCashFlowInfographic] save to localStorage failed",
        e
      );
    }
  }, [
    storageKey,
    startDate,
    startingBalance,
    hIncome,
    wIncome,
    bills,
    extraIncomes,
    minDiscretionary,
    goals,
    categoryBudgets,
    mode,
  ]);

  // --- Starting balance hydration ---
  // Compute the unified starting balance from live accounts + liveStartingBalance
  const inferredStartingBalance = useMemo(
    () =>
      sumOpeningBalance(
        liveAccounts,
        typeof liveStartingBalance === "number"
          ? liveStartingBalance
          : DEFAULT_STARTING_BALANCE
      ),
    [liveAccounts, liveStartingBalance]
  );

  // Keep local startingBalance in sync with the unified starting balance.
  useEffect(() => {
    if (typeof inferredStartingBalance !== "number") return;
    if (startingBalance !== inferredStartingBalance) {
      setStartingBalance(inferredStartingBalance);
    }
  }, [inferredStartingBalance, startingBalance]);

  // Debounced Firestore mirror
  const planMirrorDeps = [
    startDate,
    startingBalance,
    hIncome,
    wIncome,
    bills,
    extraIncomes,
    minDiscretionary,
    goals,
    categoryBudgets,
  ];
  const debouncedFsMirror = useDebouncedCallback(
    (payload) => {
      if (!USE_FS_FOR_PLANNING || !uid || !userDocRef || usePropFacts) return;
      mergeWrite(payload);
    },
    600
  );
  useEffect(() => {
    debouncedFsMirror({
      startDate,
      startingBalance,
      hIncome,
      wIncome,
      bills,
      extraIncomes,
      minDiscretionary,
      goals,
      categoryBudgets,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, USE_FS_FOR_PLANNING, usePropFacts, ...planMirrorDeps]);

  // --- Bills & goal wiring helpers ---

  // Enhance bills with partner/payer semantics.  AUTO means "let the app decide"
  // This is retained for potential future use, but engine now uses liveBills
  // directly with real accountId mappings.
  const finalBills = useMemo(() => {
    if (!Array.isArray(bills) || bills.length === 0) return [];
    const withDefaults = bills.map((b, idx) => ({
      id: b.id || `b${idx}`,
      name: b.name || "Bill",
      amount: Number(b.amount || 0),
      dueDay: b.dueDay || 1,
      payer: b.payer || "AUTO",
      category: b.category || "other",
    }));
    const autos = withDefaults.filter((b) => b.payer === "AUTO");
    if (!autos.length) return withDefaults;
    // Use autoAssignBills to approximate 51/49 split for AUTO bills
    return autoAssignBills(withDefaults);
  }, [bills]);

  // Goals: compute active contributions
  const goalContributions = useMemo(
    () => computeGoalContributions(goals),
    [goals]
  );

  const appliedGoalContributions = useMemo(() => {
    if (mode !== "actual" || confirmedForScope != null) {
      return goalContributions;
    }
    return { H: 0, W: 0, household: 0 };
  }, [mode, confirmedForScope, goalContributions]);

  // Engine projection re-runs any time planning inputs or mode change
  const enginePaidBills = useMemo(() => paidBills || {}, [paidBills]);

  // --- CORE PROJECTION LOGIC ---
  const engineProjection = useMemo(() => {
    if (!startDate) {
      return { monthlySummary: [], finalBalancesByAccount: {}, ledger: [] };
    }
    try {
      // 1. Build accounts for engine from liveAccounts
      const accountsForEngine =
        Array.isArray(liveAccounts) && liveAccounts.length
          ? liveAccounts.map((a, idx) => ({
              id: a.id || `acc-${idx}`,
              type: a.type || "checking",
              openingBalance: clampNumber(a.openingBalance || 0),
              ownerRole: a.ownerRole,
            }))
          : [
              {
                id: "default",
                type: "checking",
                openingBalance: clampNumber(
                  typeof inferredStartingBalance === "number"
                    ? inferredStartingBalance
                    : startingBalance || 0
                ),
              },
            ];

      // 2. Filter Accounts based on Scope
      // If "self", only use MY accounts + Shared. If "both", use all.
      const filteredAccounts =
        effectivePersonScope === "self"
          ? accountsForEngine.filter(
              (a) =>
                a.ownerRole === role ||
                a.ownerRole === "Joint" ||
                !a.ownerRole
            )
          : accountsForEngine;

      // Choose a safe residual account ID from the FILTERED list
      const safeResidualId =
        residualAccountIdProp &&
        filteredAccounts.some((a) => a.id === residualAccountIdProp)
          ? residualAccountIdProp
          : filteredAccounts[0]?.id;

      // 3. Filter Bills based on Scope & Split Logic
      const sourceBills = Array.isArray(liveBills) ? liveBills : [];
      let engineBills = [];

      // Get split percentages from store, or default to equal
      const hPercent = billSharing?.percentageSplit?.H ?? 0.5;
      const wPercent = billSharing?.percentageSplit?.W ?? 0.5;

      sourceBills.forEach((b, idx) => {
        const include =
          effectivePersonScope === "both" ||
          isBillVisibleInSelfScope({ bill: b, role });
        if (!include) return;

        const amount =
          effectivePersonScope === "both"
            ? Number(b.amount || 0)
            : getScopedBillAmount({ bill: b, role, billSharing });

        engineBills.push({
          id: b.id || `b${idx}`,
          name: b.name || "Bill",
          amount,
          dueDay: b.dueDay != null ? b.dueDay : 1,
          // Ensure the account ID is valid for the filtered list, else use residual
          accountId:
            (b.accountId &&
              filteredAccounts.some((a) => a.id === b.accountId) &&
              b.accountId) ||
            safeResidualId,
          status: b.status || "active",
        });
      });

      // 4. Filter Income based on Scope
      const incomeForEngine = {
        husband:
          effectivePersonScope === "both" || role === "H" ? hIncome || 0 : 0,
        wife:
          effectivePersonScope === "both" || role === "W" ? wIncome || 0 : 0,
      };

      const safeExpenses = Array.isArray(liveExpenses) ? liveExpenses : [];

      const { monthlySummary, finalBalancesByAccount, ledger } = projectCashflow({
        startDate,
        months: projectionMonths,
        accounts: filteredAccounts,
        bills: engineBills,
        income: incomeForEngine,
        extraIncomes: extraIncomes,
        expenses: safeExpenses,
        paySchedule:
          livePaySchedule && livePaySchedule.type
            ? livePaySchedule
            : { type: "semi-monthly", day1: 15, day2: "last" },
        allocationRules: liveAllocationRules || [],
        residualAccountId: safeResidualId,
        paidBills: enginePaidBills,
        mode: engineMode,
      });
      return { monthlySummary, finalBalancesByAccount, ledger };
    } catch (e) {
      console.warn("MonthlyCashFlowInfographic: engine projection failed", e);
      return { monthlySummary: [], finalBalancesByAccount: {}, ledger: [] };
    }
  }, [
    startDate,
    hIncome,
    wIncome,
    extraIncomes,
    enginePaidBills,
    livePaySchedule,
    liveAllocationRules,
    mode,
    liveBills,
    liveAccounts,
    liveExpenses,
    inferredStartingBalance,
    startingBalance,
    residualAccountIdProp,
    effectivePersonScope, // Dependency needed for re-calc
    role, // Dependency needed for re-calc
    billSharing, // Dependency needed for split math
  ]);

  const engineFirstMonth = useMemo(() => {
    const ms = engineProjection.monthlySummary || [];
    if (!ms.length) return null;
    const first = ms[0];
    return {
      label: first.monthLabel,
      income: Number(fromCents(first.totalIncome)),
      bills: Number(fromCents(first.totalBills)),
      net: Number(fromCents(first.net)),
      weeks: (first.weeks || []).map((w) => ({
        ...w,
        income: Number(fromCents(w.income)),
        bills: Number(fromCents(w.bills)),
        net: Number(fromCents(w.net)),
      })),
    };
  }, [engineProjection, mode]);

  const weeksView = useMemo(
    () =>
      buildWeeklyView({
        monthlySummary: engineProjection.monthlySummary,
        ledger: engineProjection.ledger,
        startDate,
      }),
    [engineProjection, startDate]
  );

  // Total starting balance & end-of-month balances from the engine
  // Starting balance now always reflects unified App-level truth:
  // sumOpeningBalance(liveAccounts, liveStartingBalance)
  const totalStartBalance = useMemo(
    () => inferredStartingBalance,
    [inferredStartingBalance]
  );

  const totalEndBalance = useMemo(() => {
    // Updated: subtract goal contributions from the first-month net to
    // determine true end-of-month balance.  Contributions represent money
    // allocated to savings and should reduce the available cash.  See QA bug #3.
    if (engineFirstMonth && typeof inferredStartingBalance === "number") {
      const contributionsSum =
        (appliedGoalContributions?.H || 0) +
        (appliedGoalContributions?.W || 0) +
        (appliedGoalContributions?.household || 0);
      const netAfterContrib = (engineFirstMonth.net || 0) - contributionsSum;
      return inferredStartingBalance + netAfterContrib;
    }

    // Fallback: original behavior if summary unavailable
    const fb = engineProjection.finalBalancesByAccount || {};
    return Object.values(fb).reduce((sum, v) => sum + Number(v || 0), 0);
  }, [
    engineFirstMonth,
    inferredStartingBalance,
    engineProjection.finalBalancesByAccount,
    mode,
    appliedGoalContributions,
  ]);

  // Simple health descriptor based on end balance
  const healthDescriptor = useMemo(() => {
    const totalEnd = totalEndBalance;
    if (totalEnd > 2000)
      return {
        label: "Comfortable",
        color: "success",
        bg: "bg-success-50",
        border: "border-success-200",
        borderLeft: "border-l-success-500",
        text: "text-success-700",
        dot: "bg-success-500",
      };
    if (totalEnd < 0)
      return {
        label: "Overstretched",
        color: "danger",
        bg: "bg-danger-50",
        border: "border-danger-200",
        borderLeft: "border-l-danger-500",
        text: "text-danger-700",
        dot: "bg-danger-500",
      };
    if (totalEnd < 200)
      return {
        label: "Tight",
        color: "warning",
        bg: "bg-warning-50",
        border: "border-warning-200",
        borderLeft: "border-l-warning-500",
        text: "text-warning-700",
        dot: "bg-warning-500",
      };
    return {
      label: "On track",
      color: "primary",
      bg: "bg-primary-50",
      border: "border-primary-200",
      borderLeft: "border-l-primary-500",
      text: "text-primary-700",
      dot: "bg-primary-500",
    };
  }, [totalEndBalance]);

  // Discretionary calculations use goal contributions and the engine's
  // first-month income/bills/net, which now include both bills and expenses.
  const discretionaryView = useMemo(() => {
    if (!engineFirstMonth) {
      return {
        household: { income: 0, bills: 0, goals: 0, leftover: 0 },
        H: { income: 0, bills: 0, goals: 0, leftover: 0 },
        W: { income: 0, bills: 0, goals: 0, leftover: 0 },
      };
    }

    const { income, bills, net } = engineFirstMonth;
    // Compute net after subtracting all goal contributions.  Then allocate
    // the remainder to each partner based on their income fraction.
    const goalsHousehold = appliedGoalContributions.household || 0;
    const goalsH = appliedGoalContributions.H || 0;
    const goalsW = appliedGoalContributions.W || 0;
    const totalContributions = goalsHousehold + goalsH + goalsW;

    // Net after contributions; this is the amount of cash available for the month
    // across the entire household.
    const netAfterContrib = net - totalContributions;
    const hIncomeShare = hIncome || 0;
    const wIncomeShare = wIncome || 0;
    const incomeTotal = hIncomeShare + wIncomeShare || 1;

    // Allocate the netAfterContrib proportionally to each partner
    const hShare = (netAfterContrib * hIncomeShare) / incomeTotal;
    const wShare = (netAfterContrib * wIncomeShare) / incomeTotal;

    return {
      household: {
        income,
        bills,
        goals: totalContributions,
        leftover: netAfterContrib,
      },
      H: {
        income: hIncomeShare,
        bills: (bills * hIncomeShare) / incomeTotal,
        goals: goalsH,
        leftover: hShare,
      },
      W: {
        income: wIncomeShare,
        bills: (bills * wIncomeShare) / incomeTotal,
        goals: goalsW,
        leftover: wShare,
      },
    };
  }, [engineFirstMonth, appliedGoalContributions, hIncome, wIncome, mode]);

  // Confirmed discretionary overrides
  const discretionaryForRole = useMemo(() => {
    const base =
      effectivePersonScope === "both"
        ? discretionaryView.household
        : role === "W"
        ? discretionaryView.W
        : discretionaryView.H;
    const key =
      effectivePersonScope === "both" ? "household" : role === "W" ? "W" : "H";
    const confirmed = confirmedDiscretionary[key];
    if (!confirmed) return base;
    return {
      ...base,
      leftover: confirmed,
    };
  }, [discretionaryView, confirmedDiscretionary, effectivePersonScope, role]);

  const totalEnd = totalEndBalance || 0;

  const scopeLabel = useMemo(
    () =>
      effectivePersonScope === "both"
        ? { title: "Scope: Household total", detail: "Using full household income and bills." }
        : { title: "Scope: Your share", detail: "Using your share of income and bills." },
    [effectivePersonScope]
  );

  const handleConfirmDiscretionary = useCallback(async () => {
    const key =
      effectivePersonScope === "both" ? "household" : role === "W" ? "W" : "H";
    const current =
      discretionaryView[
        effectivePersonScope === "both" ? "household" : role === "W" ? "W" : "H"
      ];
    const next = {
      ...confirmedDiscretionary,
      [key]: current.leftover,
    };
    setConfirmedDiscretionary(next);
    setConfirmedDiscretionaryStore?.(next);
    try {
      await Promise.resolve(mergeWrite({ confirmedDiscretionary: next }));
      showToast({ type: "success", message: "Plan locked for this scope." });
    } catch (err) {
      console.warn("Lock plan failed", err);
      showToast({
        type: "error",
        message: "Unable to lock plan. Please try again.",
      });
    }
  }, [
    discretionaryView,
    effectivePersonScope,
    role,
    confirmedDiscretionary,
    setConfirmedDiscretionary,
    mergeWrite,
    setConfirmedDiscretionaryStore,
    showToast,
  ]);

  const handleResetDiscretionary = useCallback(async () => {
    const key =
      effectivePersonScope === "both" ? "household" : role === "W" ? "W" : "H";
    const next = { ...confirmedDiscretionary };
    delete next[key];
    setConfirmedDiscretionary(next);
    setConfirmedDiscretionaryStore?.(next);
    try {
      await Promise.resolve(mergeWrite({ confirmedDiscretionary: next }));
      showToast({ type: "success", message: "Plan lock cleared." });
    } catch (err) {
      console.warn("Unlock plan failed", err);
      showToast({
        type: "error",
        message: "Unable to clear lock. Please try again.",
      });
    }
  }, [
    effectivePersonScope,
    role,
    confirmedDiscretionary,
    setConfirmedDiscretionary,
    mergeWrite,
    setConfirmedDiscretionaryStore,
    showToast,
  ]);

  // --- Render ---

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-caption uppercase tracking-wide text-surface-500">
            Monthly cash flow
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-surface-500" />
            <span className="text-body font-semibold text-surface-900">
              {engineFirstMonth?.label || "Your plan"}
            </span>
            <span className="text-[11px] text-surface-500">{scopeLabel.title}</span>
            <span className="text-[11px] text-surface-400">
              (Actual overlays paid bills and recorded expenses onto planned income/bills)
            </span>
          </div>
        </div>
        <div className="inline-flex items-center rounded-full bg-surface-100 border border-surface-200 p-0.5">
          <button
            type="button"
            onClick={() => setMode("planned")}
            className={`px-2.5 py-1 text-[10px] rounded-full font-medium ${
              mode === "planned"
                ? "bg-surface-50 border border-surface-200 shadow-soft text-surface-900"
                : "text-surface-500 hover:text-surface-900"
            }`}
          >
            Planned
          </button>
          <button
            type="button"
            onClick={() => setMode("actual")}
            className={`px-2.5 py-1 text-[10px] rounded-full font-medium ${
              mode === "actual"
                ? "bg-surface-50 border border-surface-200 shadow-soft text-surface-900"
                : "text-surface-500 hover:text-surface-900"
            }`}
          >
            Actual
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="bg-surface-100 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-4 py-2 rounded-2xl bg-surface-50 border border-surface-200">
            <div className="text-surface-500 font-medium uppercase tracking-wider text-caption mb-0.5">
              {scopeLabel.title}
            </div>
            <div className="text-surface-700 text-[11px]">{scopeLabel.detail}</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-surface-50 border border-surface-200">
            <div className="text-surface-500 font-medium uppercase tracking-wider text-caption mb-0.5">
              Starting Balance
            </div>
            <div className="font-bold text-surface-900 text-base">
              {fmt(totalStartBalance)}
            </div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-surface-50 border border-surface-200">
            <div className="text-surface-500 font-medium uppercase tracking-wider text-caption mb-0.5">
              {mode === "actual" ? "Actual End Balance" : "Planned End Balance"}
            </div>
            <div className="font-bold text-surface-900 text-base">
              {fmt(totalEnd)}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl border-l-4 ${healthDescriptor.bg} ${healthDescriptor.border} ${healthDescriptor.borderLeft}`}
          >
            <span className={`w-2 h-2 rounded-full ${healthDescriptor.dot}`} />
            <div className="flex flex-col">
              <span
                className={`text-[11px] font-semibold ${healthDescriptor.text}`}
              >
                {healthDescriptor.label}
              </span>
              <span className="text-caption text-surface-500">
                Based on end-of-month cash
              </span>
            </div>
          </div>
        </div>

        {/* Discretionary view */}
        <div className="mt-2 border-t border-surface-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-caption text-surface-500">
              <TrendingUp className="w-3 h-3" />
              <span>Available to spend</span>
            </div>
            <div className="flex items-center gap-1 text-caption text-surface-500">
              <span className="inline-flex items-center rounded-full border border-surface-200 px-2 py-0.5">
                <span className="w-2 h-2 rounded-full bg-success-500 mr-1" />
                Confirmed plan
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="text-caption text-surface-500">
                After bills &amp; goal savings
              </div>
              <div className="text-2xl font-semibold text-surface-900">
                {fmt(discretionaryForRole.leftover)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleConfirmDiscretionary}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-success-600 text-white text-[11px] font-medium hover:bg-success-700 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Lock this plan
              </button>
              {confirmedDiscretionary[
                effectivePersonScope === "both" ? "household" : role === "W" ? "W" : "H"
              ] && (
                <button
                  type="button"
                  onClick={handleResetDiscretionary}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface-100 border border-surface-200 text-surface-900 text-[11px] font-medium hover:bg-surface-200 transition-colors"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Clear confirmed amount
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly breakdown */}
      <div className="bg-surface-100 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-surface-900">
            Weekly flow
          </div>
          <div className="text-[11px] text-surface-500">
            {mode === "actual"
              ? "Planned baseline with paid bills and recorded expenses overlaid"
              : "Planned income, bills, goals, and savings"}
          </div>
        </div>

        {weeksView.weeks && weeksView.weeks.length > 0 ? (
          <div className="space-y-2">
            {weeksView.weeks.map((w) => (
              <div
                key={`week-${w.weekNumber}`}
                className="flex items-center justify-between rounded-2xl border border-surface-200 bg-surface-50 px-3 py-2 text-[11px]"
              >
                <div className="flex flex-col">
                  <span className="text-surface-500">{w.label}</span>
                  <span className="text-[10px] text-surface-400">
                    {fmt(w.startBalance)} → {fmt(w.endBalance)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right">
                    <span className="text-surface-500">Income</span>
                    <span className="font-semibold text-surface-900">
                      {fmt(w.income)}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-surface-500">Bills</span>
                    <span className="font-semibold text-surface-900">
                      {fmt(w.bills)}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-surface-500">Net</span>
                    <span
                      className={`font-semibold ${
                        w.net >= 0 ? "text-success-600" : "text-danger-600"
                      }`}
                    >
                      {fmt(w.net)}
                    </span>
                    <span className="text-[10px] text-surface-500 mt-0.5">
                      Goals {fmt(w.goals)} • Expenses {fmt(w.expenses)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-surface-500">
            No weekly breakdown available for this month yet. Add income and
            bills to see a weekly breakdown.
          </div>
        )}
      </div>

      {/* Error callout if Firestore failed */}
      {fsError && (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-3 py-2 text-[11px] text-warning-800 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          <span>{fsError}</span>
        </div>
      )}
    </div>
  );
}
