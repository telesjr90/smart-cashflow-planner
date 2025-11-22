// src/MonthlyCashFlowInfographic.jsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Wallet, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  projectCashflow,
  getDateForMonthIndex,
  fromCents,
} from "./lib/cashflowEngine.js";

/** =========================================================
 * Firestore-backed facts: paidBills & confirmedDiscretionary
 * ----------------------------------------------------------
 * - Uses props from App if provided (single source of truth).
 * - Otherwise, reads/writes its own Firestore doc.
 * - Planning knobs still cached to localStorage (optional FS mirror).
 * ========================================================= */

const USE_FS_FOR_PLANNING = true;
const FS_MERGE_DEBOUNCE_MS = 1500;
const LOCAL_STORAGE_KEY = "cashFlowData";

const TARGET_H_SHARE = 0.51;
const TARGET_W_SHARE = 0.49;

const DEFAULT_START_DATE = "2025-11-15";
// Use neutral defaults for planning.  Do not seed with example balances.
const DEFAULT_STARTING_BALANCE = 0;
const DEFAULT_BALANCE_SPLIT = { husband: 0, wife: 0 };

const clampNumber = (n) => (Number.isFinite(n) ? n : 0);
const fmt = (v) =>
  `$${Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Start with no sample bills.  When liveBills are provided from App
// they will be used; otherwise the planner will show an empty timeline.
const initialBills = [];

function autoAssignBills(allBills) {
  const fixedH = [],
    fixedW = [],
    unassigned = [];
  allBills.forEach((b) =>
    (b.payer === "H" ? fixedH : b.payer === "W" ? fixedW : unassigned).push({
      ...b,
    })
  );
  const total = allBills.reduce((s, b) => s + b.amount, 0);
  if (!unassigned.length || total <= 0) return allBills;
  const sumFixedH = fixedH.reduce((s, b) => s + b.amount, 0);
  const n = unassigned.length;
  let bestMask = 0,
    bestScore = Infinity,
    bestDollarError = Infinity;

  for (let mask = 0; mask < 1 << n; mask++) {
    let hExtra = 0;
    for (let i = 0; i < n; i++)
      if (mask & (1 << i)) hExtra += unassigned[i].amount;
    const hAmount = sumFixedH + hExtra;
    const hShare = hAmount / total;
    const score = Math.abs(hShare - TARGET_H_SHARE);
    const dollarError = Math.abs(hAmount - TARGET_H_SHARE * total);
    if (
      score < bestScore ||
      (score === bestScore && dollarError < bestDollarError)
    ) {
      bestScore = score;
      bestDollarError = dollarError;
      bestMask = mask;
    }
  }
  const assigned = [];
  for (let i = 0; i < n; i++)
    assigned.push({
      ...unassigned[i],
      payer: bestMask & (1 << i) ? "H" : "W",
    });
  return [...fixedH, ...fixedW, ...assigned].sort(
    (a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name)
  );
}

// Updated styling logic for the timeline view
function getWeekStatus(totalEnd) {
  if (totalEnd < 0)
    return {
      label: "At Risk",
      color: "rose",
      bg: "bg-rose-50",
      border: "border-rose-200",
      borderLeft: "border-l-rose-500",
      text: "text-rose-700",
      dot: "bg-rose-500",
    };
  if (totalEnd < 200)
    return {
      label: "Tight",
      color: "amber",
      bg: "bg-amber-50",
      border: "border-amber-200",
      borderLeft: "border-l-amber-500",
      text: "text-amber-700",
      dot: "bg-amber-500",
    };
  return {
    label: "Healthy",
    color: "emerald",
    bg: "bg-white",
    border: "border-slate-100",
    borderLeft: "border-l-emerald-500",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  };
}

// Reusable Card Component (Solid White, clean shadow)
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}
  >
    {children}
  </div>
);

export default function MonthlyCashFlowInfographic(props = {}) {
  // ---------- Props from App (optional) ----------
  const {
    uid: uidProp,
    paidBills: paidBillsProp,
    setPaidBills: setPaidBillsProp,
    confirmedDiscretionary: confirmedDiscretionaryProp,
    setConfirmedDiscretionary: setConfirmedDiscretionaryProp,
    mergeWrite: mergeWriteProp,
    personScope,
    role,

    // live data from App / myData
    liveStartDate,
    liveIncome,
    livePaySchedule,
    liveBills,

    // PHASE 3 PROPS
    liveExtraIncomes,
    onUpdateExtraIncomes,

    // PHASE 4 PROPS: Goals & Budgets (read-only here)
    liveGoals,
    liveCategoryBudgets,
  } = props;

  // ---------- Planning state ----------
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  // Use neutral defaults for new plans
  const [startingBalance, setStartingBalance] = useState(
    DEFAULT_STARTING_BALANCE
  );
  const [balanceSplit, setBalanceSplit] = useState(DEFAULT_BALANCE_SPLIT);

  // Partner incomes default to zero until provided via live props or user input
  const [hIncome, setHIncome] = useState(0);
  const [wIncome, setWIncome] = useState(0);
  const [extraIncomes, setExtraIncomes] = useState([]);
  // Local copy of bills.  Start empty; they will be populated from liveBills when provided.
  const [bills, setBills] = useState(initialBills);

  // Category budgets + goals
  const [categoryBudgets, setCategoryBudgets] = useState({});
  // Minimum discretionary thresholds (per partner) default to zero
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

  // When App passes canonical values, use them as the base
  useEffect(() => {
    if (liveStartDate) {
      setStartDate(liveStartDate);
    }
  }, [liveStartDate]);

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

    // If the canonical bills list from App is empty, clear local bills
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

  // ---------- Modes & UI ----------
  const [cashFlowMode, setCashFlowMode] = useState("projected");
  const [showWeekly, setShowWeekly] = useState(true);
  const [personView, setPersonView] = useState("both");
  const [selectedWeekMonth, setSelectedWeekMonth] = useState("0");

  const [editingBill, setEditingBill] = useState(null);

  // ---------- Firestore-backed facts ----------
  const [confirmedDiscretionaryLocal, setConfirmedDiscretionaryLocal] =
    useState({});
  const [paidBillsLocal, setPaidBillsLocal] = useState({});

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

  // ---------- Firestore infra ----------
  const uid = uidProp || auth.currentUser?.uid || null;
  const userDocRef = uid ? doc(db, "users", uid) : null;
  const fsDebounceRef = useRef(null);
  const [fsError, setFsError] = useState(null);

  const internalMergeWrite = useCallback(
    async (payload) => {
      if (!userDocRef || !payload || typeof payload !== "object") return;
      const update = {};
      Object.entries(payload).forEach(([key, value]) => {
        update[`data.cashflowInfographic.${key}`] = value;
      });
      update["updatedAt"] = serverTimestamp();
      await setDoc(userDocRef, update, { merge: true });
    },
    [userDocRef]
  );

  const mergeWrite = mergeWriteProp || internalMergeWrite;

  // ---------- LocalStorage bootstrap ----------
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
      if (saved.startDate) setStartDate(saved.startDate);
      if (typeof saved.startingBalance === "number")
        setStartingBalance(saved.startingBalance);
      if (saved.balanceSplit) setBalanceSplit(saved.balanceSplit);
      if (saved.hIncome) setHIncome(saved.hIncome);
      if (saved.wIncome) setWIncome(saved.wIncome);
      if (saved.bills) setBills(saved.bills);
      if (!liveExtraIncomes && saved.extraIncomes)
        setExtraIncomes(saved.extraIncomes);
      // if (saved.minDiscretionary) setMinDiscretionary(saved.minDiscretionary);
      if (Array.isArray(saved.goals)) setGoals(saved.goals);
      if (saved.categoryBudgets) setCategoryBudgets(saved.categoryBudgets);
      if (saved.cashFlowMode) setCashFlowMode(saved.cashFlowMode);
    } catch (e) {
      console.warn("Load localStorage failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Firestore load ----------
  const overlayPlanningFromFs = useCallback(
    (data) => {
      if (!data) return;
      if (!liveStartDate && data.startDate) setStartDate(data.startDate);
      if (typeof data.startingBalance === "number")
        setStartingBalance(data.startingBalance);
      if (data.balanceSplit) setBalanceSplit(data.balanceSplit);
      if (!liveBills && Array.isArray(data.bills)) setBills(data.bills);
      if (!liveExtraIncomes && Array.isArray(data.extraIncomes))
        setExtraIncomes(data.extraIncomes);
      if (!liveIncome && typeof data.hIncome === "number")
        setHIncome(data.hIncome);
      if (!liveIncome && typeof data.wIncome === "number")
        setWIncome(data.wIncome);
      // if (data.minDiscretionary) setMinDiscretionary(data.minDiscretionary);
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

  // ---------- Persist planning ----------
  useEffect(() => {
    const toSave = {
      startDate,
      startingBalance,
      balanceSplit,
      hIncome,
      wIncome,
      bills,
      extraIncomes,
      minDiscretionary,
      goals,
      categoryBudgets,
      cashFlowMode,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("Save localStorage failed", e);
    }
  }, [
    startDate,
    startingBalance,
    balanceSplit,
    hIncome,
    wIncome,
    bills,
    extraIncomes,
    minDiscretionary,
    goals,
    categoryBudgets,
    cashFlowMode,
  ]);

  // ---------- Debounced FS mirror ----------
  const planMirrorDeps = [
    startDate,
    startingBalance,
    balanceSplit,
    hIncome,
    wIncome,
    bills,
    extraIncomes,
    minDiscretionary,
    goals,
    categoryBudgets,
  ];

  useEffect(() => {
    if (!USE_FS_FOR_PLANNING || !uid || !userDocRef || usePropFacts) return;
    if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
    fsDebounceRef.current = setTimeout(async () => {
      try {
        await mergeWrite({
          startDate,
          startingBalance,
          balanceSplit,
          hIncome,
          wIncome,
          bills,
          extraIncomes,
          minDiscretionary,
          goals,
          categoryBudgets,
        });
      } catch (e) {
        console.warn("FS planning mirror failed", e);
        setFsError("Failed to sync planning data to cloud.");
      }
    }, FS_MERGE_DEBOUNCE_MS);
    return () => {
      if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, USE_FS_FOR_PLANNING, usePropFacts, ...planMirrorDeps]);

  // ---------- FS-backed facts handlers ----------
  const confirmDiscretionarySpending = async (
    monthIndex,
    weekIndex,
    husbandAmount,
    wifeAmount
  ) => {
    const key = `${monthIndex}-${weekIndex}`;
    const updated = {
      ...confirmedDiscretionary,
      [key]: {
        husband: clampNumber(husbandAmount),
        wife: clampNumber(wifeAmount),
        confirmed: true,
        date: new Date().toISOString(),
      },
    };
    setConfirmedDiscretionary(updated);
    try {
      await mergeWrite({ confirmedDiscretionary: updated });
    } catch {
      setFsError("Failed to save confirmed spending.");
    }
  };

  const toggleBillPayment = async (billId, monthIndex) => {
    const updated = {
      ...paidBills,
      [billId]: {
        ...(paidBills[billId] || {}),
        [monthIndex]: !paidBills[billId]?.[monthIndex],
      },
    };
    setPaidBills(updated);
    try {
      await mergeWrite({ paidBills: updated });
    } catch {
      setFsError("Failed to save bill payment.");
    }
  };
  const isBillPaid = (billId, monthIndex) =>
    !!paidBills[billId]?.[monthIndex];

  // ---------- Derived calculations ----------
  const finalBills = useMemo(() => autoAssignBills(bills), [bills]);

  const enginePaidBills = useMemo(() => {
    const source = paidBillsProp || paidBills;
    if (!source || !startDate) return {};
    const out = {};
    Object.entries(source).forEach(([billId, byMonth]) => {
      if (!byMonth) return;
      Object.entries(byMonth).forEach(([monthIndexStr, isPaid]) => {
        if (!isPaid) return;
        const monthIndex = Number(monthIndexStr);
        if (!Number.isFinite(monthIndex)) return;
        const bill = finalBills.find((b) => b.id === billId);
        const dueDay = bill?.dueDay || 1;
        const billDate = getDateForMonthIndex(startDate, monthIndex, dueDay);
        const key = `${billDate}:${billId}`;
        out[key] = true;
      });
    });
    return out;
  }, [paidBillsProp, paidBills, finalBills, startDate]);

  const engineProjection = useMemo(() => {
    if (!startDate) {
      return { monthlySummary: [], finalBalancesByAccount: {} };
    }
    try {
      const accountsForEngine = [
        {
          id: "H",
          type: "checking",
          openingBalance: balanceSplit.husband || 0,
        },
        {
          id: "W",
          type: "checking",
          openingBalance: balanceSplit.wife || 0,
        },
      ];
      const engineBills = (finalBills || []).map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDay: b.dueDay,
        accountId: b.payer === "W" ? "W" : "H",
      }));

      const { monthlySummary, finalBalancesByAccount } = projectCashflow({
        startDate,
        months: 14,
        accounts: accountsForEngine,
        bills: engineBills,
        income: { husband: hIncome || 0, wife: wIncome || 0 },
        extraIncomes: extraIncomes,
        paySchedule:
          livePaySchedule && livePaySchedule.type
            ? livePaySchedule
            : { type: "semi-monthly", day1: 15, day2: "last" },
        allocationRules: [],
        residualAccountId: "H",
        paidBills: enginePaidBills,
      });

      return {
        monthlySummary,
        finalBalancesByAccount,
      };
    } catch (e) {
      console.warn("MonthlyCashFlowInfographic: engine projection failed", e);
      return { monthlySummary: [], finalBalancesByAccount: {} };
    }
  }, [
    startDate,
    balanceSplit.husband,
    balanceSplit.wife,
    finalBills,
    hIncome,
    wIncome,
    extraIncomes,
    enginePaidBills,
    livePaySchedule,
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
    };
  }, [engineProjection.monthlySummary]);

  const generateMonthNames = (startDateStr, monthsCount = 14) => {
    const start = new Date(startDateStr);
    const months = [];
    for (let i = 0; i < monthsCount; i++) {
      const current = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push(
        current.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      );
    }
    return months;
  };
  const monthNames = useMemo(
    () => generateMonthNames(startDate, 14),
    [startDate]
  );

  const monthlySurplusBeforeDiscretionary = useMemo(() => {
    const totalMonthlyIncome =
      hIncome * 2 +
      wIncome * 2 +
      extraIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalMonthlyBills = finalBills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    return totalMonthlyIncome - totalMonthlyBills;
  }, [hIncome, wIncome, extraIncomes, finalBills]);

  const totalMonthlyGoalSavings = useMemo(
    () =>
      goals.reduce(
        (total, goal) =>
          total + (goal.perMonth || goal.allocatedMonthly || 0),
        0
      ),
    [goals]
  );

  const discretionaryBudget = useMemo(() => {
    const weeksIn14Months = 61;
    const totalMonthlyIncome =
      hIncome * 2 +
      wIncome * 2 +
      extraIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalMonthlyBills = finalBills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    const totalNetIncrease = (totalMonthlyIncome - totalMonthlyBills) * 14;
    const weeklyCombinedFromProjection = Math.max(
      0,
      totalNetIncrease / weeksIn14Months
    );

    const monthlyH = hIncome * 2;
    const monthlyW = wIncome * 2;
    const totalMonthly = monthlyH + monthlyW || 1;
    const hShare = monthlyH / totalMonthly;
    const wShare = monthlyW / totalMonthly;

    const minWeeklyH = minDiscretionary.husband / 4.33;
    const minWeeklyW = minDiscretionary.wife / 4.33;
    const minWeeklyCombined = minWeeklyH + minWeeklyW;

    const projectedWeeklyHWithoutGoals = weeklyCombinedFromProjection * hShare;
    const projectedWeeklyWWithoutGoals = weeklyCombinedFromProjection * wShare;

    const totalGoalSavings = totalMonthlyGoalSavings * 14;
    const netIncreaseWithGoals = Math.max(
      0,
      totalNetIncrease - totalGoalSavings
    );
    const weeklyCombinedWithGoalsProjection = Math.max(
      0,
      netIncreaseWithGoals / weeksIn14Months
    );
    const projectedWeeklyHWithGoals =
      weeklyCombinedWithGoalsProjection * hShare;
    const projectedWeeklyWWithGoals =
      weeklyCombinedWithGoalsProjection * wShare;

    return {
      projectedWeeklyCombinedWithoutGoals: weeklyCombinedFromProjection,
      projectedWeeklyHWithoutGoals,
      projectedWeeklyWWithoutGoals,
      projectedWeeklyCombinedWithGoals: weeklyCombinedWithGoalsProjection,
      projectedWeeklyHWithGoals,
      projectedWeeklyWWithGoals,
      weeklyCombinedWithoutGoals:
        projectedWeeklyHWithoutGoals + projectedWeeklyWWithoutGoals,
      weeklyCombinedWithGoals:
        projectedWeeklyHWithGoals + projectedWeeklyWWithGoals,
      weeklyHWithoutGoals: projectedWeeklyHWithoutGoals,
      weeklyWWithoutGoals: projectedWeeklyWWithoutGoals,
      weeklyHWithGoals: projectedWeeklyHWithGoals,
      weeklyWWithGoals: projectedWeeklyWWithGoals,
      totalMonthlyGoalSavings,
      minWeeklyH,
      minWeeklyW,
      minWeeklyCombined,
    };
  }, [
    hIncome,
    wIncome,
    extraIncomes,
    finalBills,
    goals,
    minDiscretionary,
    totalMonthlyGoalSavings,
  ]);

  const getMonthDays = (year, monthIndexZeroBased) =>
    new Date(year, monthIndexZeroBased + 1, 0).getDate();

  const getWeekRangesForMonth = (year, monthZeroBased) => {
    const daysInMonth = getMonthDays(year, monthZeroBased);
    return [
      { start: 1, end: Math.min(7, daysInMonth) },
      { start: 8, end: Math.min(14, daysInMonth) },
      { start: 15, end: Math.min(21, daysInMonth) },
      { start: 22, end: daysInMonth },
    ];
  };

  const getPaydaysForMonth = (year, monthZeroBased, paySchedule) => {
    const daysInMonth = getMonthDays(year, monthZeroBased);
    const schedule =
      paySchedule && paySchedule.type
        ? paySchedule
        : { type: "semi-monthly", day1: 15, day2: "last" };

    if (schedule.type === "semi-monthly") {
      const day1 = Math.min(
        Math.max(1, typeof schedule.day1 === "number" ? schedule.day1 : 15),
        daysInMonth
      );
      let day2;
      if (schedule.day2 === "last") {
        day2 = daysInMonth;
      } else {
        const rawDay2 =
          typeof schedule.day2 === "number" ? schedule.day2 : daysInMonth;
        day2 = Math.min(Math.max(1, rawDay2), daysInMonth);
      }
      const first = new Date(year, monthZeroBased, day1);
      const second = new Date(year, monthZeroBased, day2);
      if (day1 === day2) {
        return [first];
      }
      return [first, second];
    }
    const fallbackDay1 = Math.min(15, daysInMonth);
    const fallbackDay2 = daysInMonth;
    return [
      new Date(year, monthZeroBased, fallbackDay1),
      new Date(year, monthZeroBased, fallbackDay2),
    ];
  };

  const enhancedTransferLogic = (hBalance, wBalance) => {
    let currentH = hBalance;
    let currentW = wBalance;
    let transfer = null;
    if (currentH < 0 && currentW > 0) {
      const amt = Math.min(Math.abs(currentH), currentW);
      if (amt > 0.01) {
        currentH += amt;
        currentW -= amt;
        transfer = { from: "W", to: "H", amount: amt };
      }
    } else if (currentW < 0 && currentH > 0) {
      const amt = Math.min(Math.abs(currentW), currentH);
      if (amt > 0.01) {
        currentW += amt;
        currentH -= amt;
        transfer = { from: "H", to: "W", amount: amt };
      }
    }
    return { currentH, currentW, transfer };
  };

  const weeklyFlow = useMemo(() => {
    const startDateObj = new Date(startDate);
    const startMonth = startDateObj.getMonth();
    const startYear = startDateObj.getFullYear();
    let runningH = balanceSplit.husband || 0;
    let runningW = balanceSplit.wife || 0;
    const out = [];

    for (let monthOffset = 0; monthOffset < 14; monthOffset++) {
      const currentMonthDate = new Date(startYear, startMonth + monthOffset, 1);
      const monthIndex = monthOffset;
      const monthLabel = monthNames[monthIndex];
      const year = currentMonthDate.getFullYear();
      const monthZeroBased = currentMonthDate.getMonth();
      const weekRanges = getWeekRangesForMonth(year, monthZeroBased);

      for (let wk = 0; wk < weekRanges.length; wk++) {
        const weekRange = weekRanges[wk];
        const weekStartDate = new Date(year, monthZeroBased, weekRange.start);
        const weekEndDate = new Date(year, monthZeroBased, weekRange.end);
        if (weekEndDate < startDateObj) continue;

        let hIn = 0,
          wIn = 0;
        const effectivePaySchedule =
          livePaySchedule && livePaySchedule.type
            ? livePaySchedule
            : { type: "semi-monthly", day1: 15, day2: "last" };
        const paydays = getPaydaysForMonth(
          year,
          monthZeroBased,
          effectivePaySchedule
        );
        paydays.forEach((payDate) => {
          if (
            payDate >= startDateObj &&
            payDate >= weekStartDate &&
            payDate <= weekEndDate
          ) {
            hIn += hIncome;
            wIn += wIncome;
          }
        });

        if (weekRange.start <= 7) {
          extraIncomes.forEach((income) => {
            if (income.payer === "H") hIn += income.amount;
            else wIn += income.amount;
          });
        }

        let hBill = 0,
          wBill = 0;
        const hBillList = [],
          wBillList = [];
        finalBills.forEach((b) => {
          const billDateStr = getDateForMonthIndex(
            startDate,
            monthIndex,
            b.dueDay
          );
          const billDate = new Date(`${billDateStr}T00:00:00`);
          if (billDate < startDateObj) return;
          const includeByPayment =
            cashFlowMode === "projected" ? true : isBillPaid(b.id, monthIndex);

          if (
            includeByPayment &&
            billDate >= weekStartDate &&
            billDate <= weekEndDate
          ) {
            if (b.payer === "H") {
              hBill += b.amount;
              hBillList.push(b.name);
            } else {
              wBill += b.amount;
              wBillList.push(b.name);
            }
          }
        });

        const hStart = runningH;
        const wStart = runningW;
        let currentH = runningH + hIn - hBill;
        let currentW = runningW + wIn - wBill;

        let transfer = null;
        const pre = enhancedTransferLogic(currentH, currentW);
        currentH = pre.currentH;
        currentW = pre.currentW;
        transfer = pre.transfer;

        const weeklyDiscretionaryH =
          cashFlowMode === "actual"
            ? confirmedDiscretionary[`${monthIndex}-${wk}`]?.husband ?? 0
            : discretionaryBudget.weeklyHWithoutGoals;

        const weeklyDiscretionaryW =
          cashFlowMode === "actual"
            ? confirmedDiscretionary[`${monthIndex}-${wk}`]?.wife ?? 0
            : discretionaryBudget.weeklyWWithoutGoals;

        currentH -= weeklyDiscretionaryH;
        currentW -= weeklyDiscretionaryW;

        const post = enhancedTransferLogic(currentH, currentW);
        currentH = post.currentH;
        currentW = post.currentW;

        if (post.transfer) {
          if (transfer && transfer.from === post.transfer.from) {
            transfer = {
              ...post.transfer,
              amount: transfer.amount + post.transfer.amount,
            };
          } else {
            transfer = post.transfer;
          }
        }

        out.push({
          month: monthLabel,
          week: `W${wk + 1}`,
          range: `${weekRange.start}-${weekRange.end}`,
          monthIndex,
          weekIndex: wk,
          hStart,
          wStart,
          hIn,
          wIn,
          hBill,
          wBill,
          hDiscretionary: weeklyDiscretionaryH,
          wDiscretionary: weeklyDiscretionaryW,
          hBillList,
          wBillList,
          hEnd: currentH,
          wEnd: currentW,
          totalEnd: currentH + currentW,
          transfer,
          discretionaryConfirmed: !!confirmedDiscretionary[
            `${monthIndex}-${wk}`
          ],
        });
        runningH = currentH;
        runningW = currentW;
      }
    }
    return out;
  }, [
    finalBills,
    hIncome,
    wIncome,
    extraIncomes,
    discretionaryBudget,
    cashFlowMode,
    confirmedDiscretionary,
    paidBills,
    startDate,
    balanceSplit,
    monthNames,
    livePaySchedule,
  ]);

  const filteredWeeklyFlow = useMemo(() => {
    const idx = Number(selectedWeekMonth);
    if (Number.isNaN(idx) || idx < 0) return weeklyFlow;
    return weeklyFlow.filter((w) => w.monthIndex === idx);
  }, [weeklyFlow, selectedWeekMonth]);

  const getPersonFilteredWeeklyData = useCallback(
    (data) => {
      if (personView === "both") return data;
      return data.map((week) => {
        if (personView === "husband")
          return {
            ...week,
            wStart: 0,
            wIn: 0,
            wBill: 0,
            wDiscretionary: 0,
            wEnd: 0,
            wBillList: [],
            totalEnd: week.hEnd,
            transfer: week.transfer?.from === "H" ? week.transfer : null,
          };
        return {
          ...week,
          hStart: 0,
          hIn: 0,
          hBill: 0,
          hDiscretionary: 0,
          hEnd: 0,
          hBillList: [],
          totalEnd: week.wEnd,
          transfer: week.transfer?.from === "W" ? week.transfer : null,
        };
      });
    },
    [personView]
  );

  const personFilteredWeeklyFlow = useMemo(
    () => getPersonFilteredWeeklyData(filteredWeeklyFlow),
    [filteredWeeklyFlow, getPersonFilteredWeeklyData]
  );

  const WeeklyFlowSection = () => (
    <Card className="p-0">
      {/* Timeline Header */}
      <div className="p-4 md:px-6 md:py-4 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Weekly Timeline
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {cashFlowMode === "projected"
                ? "Estimating discretionary spend"
                : "Tracking actual discretionary spend"}
            </div>
          </div>

          {/* Controls Group */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Pill Filter Group */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <select
                value={selectedWeekMonth}
                onChange={(e) => setSelectedWeekMonth(e.target.value)}
                className="text-xs rounded-full border-0 bg-transparent py-1 pl-2 pr-1 focus:ring-0 text-slate-600 font-medium"
              >
                <option value="-1">All Months</option>
                {monthNames.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <div className="h-4 w-px bg-slate-300" />
              <button
                onClick={() => setCashFlowMode("projected")}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  cashFlowMode === "projected"
                    ? "bg-white text-indigo-600 shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Projected
              </button>
              <button
                onClick={() => setCashFlowMode("actual")}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  cashFlowMode === "actual"
                    ? "bg-white text-indigo-600 shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Actual
              </button>
            </div>

            <button
              onClick={() => setShowWeekly((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              {showWeekly ? "Hide Weeks" : "Show Weeks"}
            </button>
          </div>
        </div>
      </div>

      {showWeekly && (
        <div className="p-4 md:p-5 bg-slate-50/50">
          {fsError && (
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {fsError}
            </div>
          )}

          {/* Scrollable row of week cards */}
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <div className="flex space-x-4 py-2 pb-4 min-w-max">
              {personFilteredWeeklyFlow.map((week) => {
                const status = getWeekStatus(week.totalEnd);

                const isCombined = personView === "both";
                const label =
                  personView === "husband"
                    ? "Partner H"
                    : personView === "wife"
                    ? "Partner W"
                    : "Combined";

                const startVal = isCombined
                  ? week.hStart + week.wStart
                  : personView === "husband"
                  ? week.hStart
                  : week.wStart;

                const inVal = isCombined
                  ? week.hIn + week.wIn
                  : personView === "husband"
                  ? week.hIn
                  : week.wIn;

                const billVal = isCombined
                  ? week.hBill + week.wBill
                  : personView === "husband"
                  ? week.hBill
                  : week.wBill;

                const discVal = isCombined
                  ? week.hDiscretionary + week.wDiscretionary
                  : personView === "husband"
                  ? week.hDiscretionary
                  : week.wDiscretionary;

                const endVal = isCombined
                  ? week.totalEnd
                  : personView === "husband"
                  ? week.hEnd
                  : week.wEnd;

                return (
                  <div
                    key={`${week.monthIndex}-${week.weekIndex}`}
                    className={`relative flex-none w-[320px] bg-white rounded-2xl shadow-sm border ${status.border} ${status.borderLeft}`}
                  >
                    {/* Card Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-2xl">
                      <div>
                        <div className="text-xs font-bold text-slate-700">
                          {week.month.split(" ")[0]} {week.week}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {week.range}
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${status.border} ${status.bg}`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide ${status.text}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* ACTUAL MODE INPUTS */}
                      {cashFlowMode === "actual" && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              Confirm Discretionary
                            </span>
                            {week.discretionaryConfirmed && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            )}
                          </div>
                          <div className="space-y-2">
                            {(personView === "both" ||
                              personView === "husband") && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 w-12 font-medium">
                                  Partner H
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="flex-1 text-xs py-1 px-2 rounded border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                  placeholder="0.00"
                                  value={
                                    confirmedDiscretionary[
                                      `${week.monthIndex}-${week.weekIndex}`
                                    ]?.husband ?? 0
                                  }
                                  onChange={(e) =>
                                    confirmDiscretionarySpending(
                                      week.monthIndex,
                                      week.weekIndex,
                                      parseFloat(e.target.value) || 0,
                                      confirmedDiscretionary[
                                        `${week.monthIndex}-${week.weekIndex}`
                                      ]?.wife || 0
                                    )
                                  }
                                />
                              </div>
                            )}
                            {(personView === "both" || personView === "wife") && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 w-12 font-medium">
                                  Partner W
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="flex-1 text-xs py-1 px-2 rounded border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                  placeholder="0.00"
                                  value={
                                    confirmedDiscretionary[
                                      `${week.monthIndex}-${week.weekIndex}`
                                    ]?.wife ?? 0
                                  }
                                  onChange={(e) =>
                                    confirmDiscretionarySpending(
                                      week.monthIndex,
                                      week.weekIndex,
                                      confirmedDiscretionary[
                                        `${week.monthIndex}-${week.weekIndex}`
                                      ]?.husband || 0,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Compact Stats Block */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {label}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Start</span>
                          <span className="font-medium text-slate-700">
                            {fmt(startVal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600">In</span>
                          <span className="font-medium text-emerald-700">
                            +{fmt(inVal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-rose-600">Bills</span>
                          <span className="font-medium text-rose-700">
                            -{fmt(billVal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Disc.</span>
                          <span className="font-medium text-slate-600">
                            -{fmt(discVal)}
                          </span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between text-xs font-bold">
                          <span className="text-slate-800">End</span>
                          <span className="text-slate-900">{fmt(endVal)}</span>
                        </div>
                      </div>

                      {/* Footer: Total & Transfer */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-end justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              Combined Total
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                week.totalEnd < 0
                                  ? "text-rose-600"
                                  : "text-slate-900"
                              }`}
                            >
                              {fmt(week.totalEnd)}
                            </span>
                          </div>
                          {week.transfer && (
                            <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium border border-indigo-100">
                              Swap {fmt(week.transfer.amount)} from{" "}
                              {week.transfer.from === "H"
                                ? "Partner H"
                                : "Partner W"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 font-sans text-slate-800">
      {/* Single-column stack of cards */}
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header Card */}
        <Card className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Cash Flow Plan
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  {startDate
                    ? `${new Date(startDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })} → ${monthNames.at(-1)}`
                    : "Planning across 14 months"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px] mb-0.5">
                  Starting Balance
                </div>
                <div className="font-bold text-slate-700 text-base">
                  {fmt(startingBalance)}
                </div>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px] mb-0.5">
                  Min Discretionary (T / N)
                </div>
                <div className="font-bold text-slate-700 text-base">
                  {fmt(minDiscretionary.husband)} /{" "}
                  {fmt(minDiscretionary.wife)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* This month at a glance */}
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-base font-bold text-slate-900">
                This month at a glance
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Engine-based projection for {engineFirstMonth?.label}
              </div>
            </div>
            {engineFirstMonth && (
              <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                {engineFirstMonth.label}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex flex-col justify-between h-28">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600/80">
                  Income
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-900">
                {engineFirstMonth
                  ? fmt(engineFirstMonth.income)
                  : fmt(hIncome * 2 + wIncome * 2)}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex flex-col justify-between h-28">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-rose-600/80">
                  Bills
                </span>
                <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />
              </div>
              <div className="text-2xl font-bold text-rose-900">
                {engineFirstMonth
                  ? fmt(engineFirstMonth.bills)
                  : fmt(finalBills.reduce((s, b) => s + b.amount, 0))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 text-white p-4 flex flex-col justify-between h-28 shadow-lg shadow-slate-200">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Net Flow
                </span>
                <Wallet className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold">
                {engineFirstMonth
                  ? fmt(engineFirstMonth.net)
                  : fmt(
                      hIncome * 2 +
                        wIncome * 2 -
                        finalBills.reduce((s, b) => s + b.amount, 0)
                    )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Summary */}
        <Card className="p-5 md:p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Quick Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 text-white shadow-sm">
              <div className="text-xs text-slate-300 font-medium">
                Est. Net (Per Month)
              </div>
              <div className="text-sm font-bold">
                {engineFirstMonth
                  ? fmt(engineFirstMonth.net)
                  : fmt(monthlySurplusBeforeDiscretionary)}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-1" />

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <div className="text-xs text-slate-500">
                  Weekly Allowance (After Goals)
                </div>
                <div className="text-sm font-semibold text-emerald-600">
                  {fmt(discretionaryBudget.projectedWeeklyCombinedWithGoals)}
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <div className="text-xs text-slate-500">
                  Monthly Goal Savings
                </div>
                <div className="text-sm font-semibold text-indigo-600">
                  {fmt(totalMonthlyGoalSavings)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Weekly Timeline */}
        <WeeklyFlowSection />

        {/* Next 6 Weeks */}
        <Card className="p-5 md:p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Next 6 Weeks
          </h2>
          <div className="space-y-2.5">
            {personFilteredWeeklyFlow.slice(0, 6).map((w, i) => {
              const status = getWeekStatus(w.totalEnd);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-sm ${status.bg} ${status.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {w.month.split(" ")[0]} {w.week}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {w.range}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          w.totalEnd < 0 ? "text-rose-600" : "text-slate-800"
                        }`}
                      >
                        {fmt(w.totalEnd)}
                      </div>
                    </div>
                  </div>

                  {/* Mini details */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 border-t border-slate-200/50 pt-2">
                    <span>H: {fmt(w.hEnd)}</span>
                    <span>W: {fmt(w.wEnd)}</span>
                  </div>

                  {w.transfer && (
                    <div className="self-start inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-medium text-indigo-700">
                      Swap {fmt(w.transfer.amount)} from{" "}
                      {w.transfer.from === "H" ? "Partner H" : "Partner W"}
                    </div>
                  )}
                </div>
              );
            })}
            {!personFilteredWeeklyFlow.length && (
              <div className="text-slate-500 text-xs text-center py-4">
                No upcoming weeks found.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
