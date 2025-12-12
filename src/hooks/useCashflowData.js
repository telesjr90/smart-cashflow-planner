// File: src/hooks/useCashflowData.js
import { useState, useEffect, useRef, useCallback } from "react";
import { shallow } from "zustand/shallow";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { getDefaultPlannerStartDate } from "../lib/cashflow/index.js";
import { useToast } from "../components/ui/toast/useToast";
import { useCashflowStore } from "../store/useCashflowStore";

// --- Constants & Defaults ---
const USERS = "users";
const DEFAULT_START_DATE = getDefaultPlannerStartDate();
const DEFAULT_STARTING_BALANCE = 0;
const DEFAULT_SPLIT = { husband: 0, wife: 0 };
const DEFAULT_INCOME = { husband: 0, wife: 0 };
const DEFAULT_PAY_SCHEDULE = { type: "semi-monthly", day1: 15, day2: "last" };

export const emptyUserData = {
  startDate: DEFAULT_START_DATE,
  startingBalance: DEFAULT_STARTING_BALANCE,
  balanceSplit: { ...DEFAULT_SPLIT },
  bills: [],
  paidBills: {},
  confirmedDiscretionary: {},
  expenses: [],
  categoryBudgets: {},
  goals: [],
  extraIncomes: [],
  accounts: [],
  allocationRules: [],
  residualAccountId: null,
  income: { ...DEFAULT_INCOME },
  paySchedule: { ...DEFAULT_PAY_SCHEDULE },
  billSharing: {
    mode: "manual",
    percentageSplit: { H: 0.5, W: 0.5 },
    sharedBillIds: [],
  },
  updatedAt: null,
};

export const DEFAULT_SECTION_VERSIONS = {
  core: 0,
  bills: 0,
  goals: 0,
  budgets: 0,
  accounts: 0,
  allocations: 0,
  income: 0,
  billSharing: 0,
  expenses: 0,
};

const SECTION_LABELS = {
  core: "Core settings",
  bills: "Bills",
  goals: "Goals",
  budgets: "Budgets",
  accounts: "Accounts",
  allocations: "Allocation rules",
  income: "Income & pay schedule",
  billSharing: "Bill sharing",
  expenses: "Expenses",
};

// --- Helper Functions ---

async function ensureUserDoc(user) {
  const ref = doc(db, USERS, user.uid);
  if (!navigator.onLine) throw new Error("Offline: cannot ensure user doc");

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const payload = {
      profile: {
        email: user.email || "",
        displayName: user.displayName || "",
        role: "H",
        householdId: user.uid,
      },
      data: { ...emptyUserData },
      dataVersion: 0,
      sectionVersions: { ...DEFAULT_SECTION_VERSIONS },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload, { merge: true });
  }
}

async function saveUserProfile(uid, profileUpdates) {
  const ref = doc(db, USERS, uid);
  const updatePayload = {};
  for (const [k, v] of Object.entries(profileUpdates)) {
    updatePayload[`profile.${k}`] = v;
  }
  updatePayload.updatedAt = serverTimestamp();
  await setDoc(ref, updatePayload, { merge: true });
}

async function saveUserPartial(uid, partialData) {
  const ref = doc(db, USERS, uid);
  await setDoc(
    ref,
    { data: { ...partialData }, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

async function saveUserSectionsWithVersion(uid, sections, localSectionVersions, updateFn) {
  const ref = doc(db, USERS, uid);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("user-doc-missing");
    }

    const docData = snap.data();
    const serverData = { ...emptyUserData, ...(docData.data || {}) };
    const serverSectionVersions = docData.sectionVersions || {};

    for (const section of sections) {
      const serverVersion = serverSectionVersions[section] ?? 0;
      const localVersion = localSectionVersions[section] ?? 0;

      if (serverVersion !== localVersion) {
        const err = new Error("section-version-conflict");
        err.section = section;
        err.serverVersion = serverVersion;
        err.localVersion = localVersion;
        throw err;
      }
    }

    const { nextData, touchedSections = sections } = updateFn(serverData) || {};

    const nextSectionVersions = { ...serverSectionVersions };
    touchedSections.forEach((section) => {
      const curr = nextSectionVersions[section] ?? 0;
      nextSectionVersions[section] = curr + 1;
    });

    tx.update(ref, {
      data: nextData,
      sectionVersions: nextSectionVersions,
      updatedAt: serverTimestamp(),
    });

    return nextSectionVersions;
  });
}

async function loadHouseholdMembers(currentUserUid) {
  try {
    const meSnap = await getDoc(doc(db, USERS, currentUserUid));
    const meData = meSnap.exists() ? meSnap.data() : null;
    const householdId = meData?.profile?.householdId || currentUserUid;
    if (!householdId) return [];

    const q = query(collection(db, USERS), where("profile.householdId", "==", householdId));
    const res = await getDocs(q);
    const members = [];
    res.forEach((d) => members.push({ id: d.id, ...d.data(), uid: d.id }));
    return members;
  } catch (e) {
    console.warn("loadHouseholdMembers failed", e);
    return [];
  }
}

const selectPlanSnapshot = (state) => ({
  startDate: state.startDate,
  startingBalance: state.startingBalance,
  bills: state.recurringBills?.length ? state.recurringBills : state.bills,
  paidBills: state.paidBills,
  confirmedDiscretionary: state.confirmedDiscretionary,
  expenses: state.transactions?.length ? state.transactions : state.expenses,
  categoryBudgets: state.categoryBudgets,
  goals: state.goals,
  extraIncomes: state.extraIncomes,
  accounts: state.accounts,
  allocationRules: state.allocationRules,
  residualAccountId: state.residualAccountId,
  income: state.income,
  paySchedule: state.paySchedule,
  billSharing: state.billSharing,
  balanceSplit: state.balanceSplit,
});

const mergeWithEmptyData = (plan) => {
  const base = plan || {};
  return {
    ...emptyUserData,
    ...base,
    paidBills: { ...emptyUserData.paidBills, ...(base.paidBills || {}) },
    confirmedDiscretionary: { ...emptyUserData.confirmedDiscretionary, ...(base.confirmedDiscretionary || {}) },
    categoryBudgets: { ...emptyUserData.categoryBudgets, ...(base.categoryBudgets || {}) },
    billSharing: { ...emptyUserData.billSharing, ...(base.billSharing || {}) },
    income: { ...emptyUserData.income, ...(base.income || {}) },
    paySchedule: { ...emptyUserData.paySchedule, ...(base.paySchedule || {}) },
    balanceSplit: { ...emptyUserData.balanceSplit, ...(base.balanceSplit || {}) },
    expenses: base.expenses || emptyUserData.expenses,
    bills: base.bills || emptyUserData.bills,
    accounts: base.accounts || emptyUserData.accounts,
  };
};

// --- The Hook ---

export default function useCashflowData() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [myData, setMyData] = useState(null);
  const [household, setHousehold] = useState([]);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCached, setHasCached] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const [mySectionVersions, setMySectionVersions] = useState(DEFAULT_SECTION_VERSIONS);

  const { showToast } = useToast();
  const userUnsubRef = useRef(null);
  const seededOnce = useRef(false);
  
  // Guard ref to prevent infinite loops during store hydration
  const hasHydratedRef = useRef(false);

  const planFromStore = useCashflowStore(selectPlanSnapshot, shallow);
  const setFullPlanData = useCashflowStore((state) => state.setFullPlanData);

  // Check for Agent Demo mode
  const isAgentDemo =
    typeof window !== "undefined" && window.location.search.includes("agentDemo=1");

  if (typeof window !== "undefined" && isAgentDemo) {
    // eslint-disable-next-line no-undef
    window.__TEST_USER__ = true;
  }

  // Auth & Subscription Effect
  useEffect(() => {
    // --- PATH A: DEMO MODE ---
    if (isAgentDemo) {
      // Demo path: bypass Firebase and hydrate from local store (if any) plus defaults.
      // GUARD: Only run this ONCE to avoid infinite loops
      if (!hasHydratedRef.current) {
        const demoUser = { uid: "demo-user", displayName: "Agent Demo" };
        setUser(demoUser);
        const mergedDemoData = mergeWithEmptyData(planFromStore);
        
        setFullPlanData?.(mergedDemoData);
        
        setMe({
          profile: {
            email: "demo@example.com",
            displayName: "Agent Demo",
            role: "H",
            householdId: "demo-household",
          },
          data: { ...mergedDemoData },
          sectionVersions: { ...DEFAULT_SECTION_VERSIONS },
        });
        setMyData({ ...mergedDemoData });
        setMySectionVersions({ ...DEFAULT_SECTION_VERSIONS });
        setHousehold([]);
        setLoading(false);
        setHasCached(true);
        
        hasHydratedRef.current = true; // Mark as hydrated
      }
      return;
    }

    // --- PATH B: FIREBASE UNAVAILABLE ---
    if (!auth || !db) {
      // Firebase unavailable: rely on local store snapshot and mark limited functionality.
      setNetworkError(true);
      if (!hasHydratedRef.current) {
         const fallback = mergeWithEmptyData(planFromStore);
         setMyData(fallback);
         setFullPlanData?.(fallback);
         hasHydratedRef.current = true;
      }
      setLoading(false);
      setHasCached(true);
      return;
    }

    // --- PATH C: FIREBASE ONLINE ---
    // Normal auth flow + Firestore subscription.
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (!u) {
        if (userUnsubRef.current) {
          try {
            userUnsubRef.current();
          } catch {}
          userUnsubRef.current = null;
        }
        setMe(null);
        setMyData(null);
        setHousehold([]);
        setMySectionVersions({ ...DEFAULT_SECTION_VERSIONS });
        setLoading(false);
        setHasCached(false);
        return;
      }

      if (navigator.onLine && !seededOnce.current) {
        try {
          await ensureUserDoc(u);
          seededOnce.current = true;
        } catch (e) {
          console.warn("ensureUserDoc failed", e);
        }
      }

      const ref = doc(db, USERS, u.uid);
      userUnsubRef.current = onSnapshot(
        ref,
        async (snap) => {
          setLoading(false);
          if (snap.exists()) {
            const data = snap.data();
            const core = { ...emptyUserData, ...(data?.data || {}) };
            setMe(data || null);
            setMyData(core);

            const sv = data?.sectionVersions || {};
            setMySectionVersions({
              core: sv.core ?? DEFAULT_SECTION_VERSIONS.core,
              bills: sv.bills ?? DEFAULT_SECTION_VERSIONS.bills,
              goals: sv.goals ?? DEFAULT_SECTION_VERSIONS.goals,
              budgets: sv.budgets ?? DEFAULT_SECTION_VERSIONS.budgets,
              accounts: sv.accounts ?? DEFAULT_SECTION_VERSIONS.accounts,
              allocations: sv.allocations ?? DEFAULT_SECTION_VERSIONS.allocations,
              income: sv.income ?? DEFAULT_SECTION_VERSIONS.income,
              billSharing: sv.billSharing ?? DEFAULT_SECTION_VERSIONS.billSharing,
              expenses: sv.expenses ?? DEFAULT_SECTION_VERSIONS.expenses,
            });

            setHasCached(true);
            try {
              setHouseholdLoading(true);
              const hh = await loadHouseholdMembers(u.uid);
              setHousehold(hh);
              setHouseholdLoading(false);
            } catch (err) {
              console.warn("Household load failed", err);
              setHouseholdLoading(false);
            }
          } else {
            setMe(null);
            setMyData(emptyUserData);
            setMySectionVersions({ ...DEFAULT_SECTION_VERSIONS });
            setHasCached(true);
          }
        },
        (err) => {
          console.warn("onSnapshot error", err);
          setLoading(false);
          setNetworkError(true);
          
          // Fallback logic on error
          if (!hasHydratedRef.current) {
            const fallbackData = mergeWithEmptyData(planFromStore);
            setMyData(fallbackData);
            setFullPlanData?.(fallbackData);
            hasHydratedRef.current = true;
          }
          setHasCached(true);
        }
      );
    });

    return () => {
      unsubAuth();
      if (userUnsubRef.current) {
        try {
          userUnsubRef.current();
        } catch {}
        userUnsubRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Handlers ---

  const showVersionConflictToast = useCallback(
    ({ section, serverVersion, localVersion, retry }) => {
      const label = SECTION_LABELS[section] || section || "Data";
      const versionInfo =
        serverVersion !== undefined && localVersion !== undefined
          ? ` (server v${serverVersion}, local v${localVersion})`
          : "";
      showToast({
        type: "error",
        message: `${label} changed elsewhere${versionInfo}. Please refresh or retry.`,
        actionLabel: retry ? "Retry" : undefined,
        onAction: retry || undefined,
      });
    },
    [showToast]
  );

  const handleUpdateBills = useCallback(
    async (nextBills) => {
      const base = myData || emptyUserData;
      setMyData({ ...base, bills: nextBills });
      if (isAgentDemo || !auth.currentUser) return;

      try {
        const newVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["bills"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, bills: nextBills },
            touchedSections: ["bills"],
          })
        );
        setMySectionVersions(newVersions);
      } catch (err) {
        console.warn("Failed to save bills", err);
        if (err.message === "section-version-conflict" && err.section === "bills") {
          showVersionConflictToast({
            section: err.section,
            serverVersion: err.serverVersion,
            localVersion: err.localVersion,
            retry: () => handleUpdateBills(nextBills),
          });
        }
      }
    },
    [myData, mySectionVersions, isAgentDemo, showVersionConflictToast]
  );

  const handleChangeBillAccount = useCallback(
    async (billId, accountId) => {
      const base = myData || emptyUserData;
      const updatedBills = (base.bills || []).map((b) =>
        b.id === billId ? { ...b, accountId } : b
      );
      // Reuse handleUpdateBills logic
      await handleUpdateBills(updatedBills);
    },
    [myData, handleUpdateBills]
  );

  const handleTogglePaid = useCallback(
    async ({ billId, monthIndex, next }) => {
      const base = myData || emptyUserData;
      const startDate = base.startDate || DEFAULT_START_DATE;

      // Helper to calc date string from index (duplicated from App.jsx/engine to keep hook self-contained)
      const s = new Date(startDate + "T00:00:00");
      const d = new Date(s.getFullYear(), s.getMonth() + monthIndex, 1);
      const dateStr = d.toISOString().slice(0, 10);

      const key = `${dateStr}:${billId}`;
      const map = { ...(base.paidBills || {}) };
      if (next) map[key] = true;
      else delete map[key];

      setMyData({ ...base, paidBills: map });
      if (isAgentDemo || !auth.currentUser) return;

      try {
        const newVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["bills"],
          mySectionVersions,
          (serverData) => {
            const current = { ...(serverData.paidBills || {}) };
            if (next) current[key] = true;
            else delete current[key];
            return {
              nextData: { ...serverData, paidBills: current },
              touchedSections: ["bills"],
            };
          }
        );
        setMySectionVersions(newVersions);
      } catch (err) {
        console.warn("Failed to toggle paid", err);
        if (err.message === "section-version-conflict") {
          showVersionConflictToast({
            section: err.section || "bills",
            serverVersion: err.serverVersion,
            localVersion: err.localVersion,
            retry: () => handleTogglePaid({ billId, monthIndex, next }),
          });
        }
      }
    },
    [myData, mySectionVersions, isAgentDemo, showVersionConflictToast]
  );

  const handleBulkMark = useCallback(
    async ({ billIds, monthIndex, value }) => {
      const base = myData || emptyUserData;
      const startDate = base.startDate || DEFAULT_START_DATE;

      const s = new Date(startDate + "T00:00:00");
      const d = new Date(s.getFullYear(), s.getMonth() + monthIndex, 1);
      const dateStr = d.toISOString().slice(0, 10);

      const optimisticMap = { ...(base.paidBills || {}) };
      billIds.forEach((billId) => {
        const key = `${dateStr}:${billId}`;
        if (value) optimisticMap[key] = true;
        else delete optimisticMap[key];
      });

      setMyData({ ...base, paidBills: optimisticMap });
      if (isAgentDemo || !auth.currentUser) return;

      try {
        const newVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["bills"],
          mySectionVersions,
          (serverData) => {
            const current = { ...(serverData.paidBills || {}) };
            billIds.forEach((billId) => {
              const key = `${dateStr}:${billId}`;
              if (value) current[key] = true;
              else delete current[key];
            });
            return {
              nextData: { ...serverData, paidBills: current },
              touchedSections: ["bills"],
            };
          }
        );
        setMySectionVersions(newVersions);
      } catch (err) {
        console.warn("Failed bulk mark", err);
        if (err.message === "section-version-conflict") {
          showVersionConflictToast({
            section: err.section || "bills",
            serverVersion: err.serverVersion,
            localVersion: err.localVersion,
            retry: () => handleBulkMark({ billIds, monthIndex, value }),
          });
        }
      }
    },
    [myData, mySectionVersions, isAgentDemo, showVersionConflictToast]
  );

  // Generic handler creator for simple section updates
  const createUpdateHandler = (sectionName, keyInState) => async (newValue, extraArg) => {
    const base = myData || emptyUserData;
    const optimistic = { ...base, [keyInState]: newValue };
    // Handle special case for accounts residual ID
    if (keyInState === "accounts" && extraArg !== undefined) {
      optimistic.residualAccountId = extraArg || base.residualAccountId || newValue[0]?.id || null;
    }
    setMyData(optimistic);

    if (isAgentDemo || !auth.currentUser) return;

    try {
      const newVersions = await saveUserSectionsWithVersion(
        auth.currentUser.uid,
        [sectionName],
        mySectionVersions,
        (serverData) => {
          const update = { [keyInState]: newValue };
          if (keyInState === "accounts") {
            update.residualAccountId = optimistic.residualAccountId;
          }
          return {
            nextData: { ...serverData, ...update },
            touchedSections: [sectionName],
          };
        }
      );
      setMySectionVersions(newVersions);
    } catch (err) {
      console.warn(`Failed to update ${sectionName}`, err);
      if (err.message === "section-version-conflict" && err.section === sectionName) {
        showVersionConflictToast({
          section: sectionName,
          serverVersion: err.serverVersion,
          localVersion: err.localVersion,
          retry: () => createUpdateHandler(sectionName, keyInState)(newValue, extraArg),
        });
      }
    }
  };

  const handleUpdateAccounts = createUpdateHandler("accounts", "accounts");
  const handleUpdateAllocationRules = createUpdateHandler("allocations", "allocationRules");
  const handleUpdateGoals = createUpdateHandler("goals", "goals");
  const handleUpdateBudgets = createUpdateHandler("budgets", "categoryBudgets");
  const handleUpdateStartingBalance = createUpdateHandler("core", "startingBalance");
  const handleUpdateExpenses = createUpdateHandler("expenses", "expenses");
  const handleUpdateBillSharing = createUpdateHandler("billSharing", "billSharing");
  const handleUpdateExtraIncome = createUpdateHandler("income", "extraIncomes");

  const handleAddExpense = useCallback(
    (newExpense) => {
      const current = myData?.expenses || [];
      handleUpdateExpenses([...current, newExpense]);
    },
    [myData, handleUpdateExpenses]
  );

  const handleUpdateIncomeAndPaySchedule = useCallback(
    async (nextIncome, nextPaySchedule) => {
      const base = myData || emptyUserData;
      setMyData({ ...base, income: nextIncome, paySchedule: nextPaySchedule });
      if (isAgentDemo || !auth.currentUser) return;

      try {
        await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["income"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, income: nextIncome, paySchedule: nextPaySchedule },
            touchedSections: ["income"],
          })
        );
      } catch (err) {
        console.warn("Income update failed", err);
        if (err.message === "section-version-conflict") {
          showVersionConflictToast({
            section: err.section || "income",
            serverVersion: err.serverVersion,
            localVersion: err.localVersion,
            retry: () => handleUpdateIncomeAndPaySchedule(nextIncome, nextPaySchedule),
          });
        }
      }
    },
    [myData, mySectionVersions, isAgentDemo, showVersionConflictToast]
  );

  const handleUpdateProfile = useCallback(
    (updates) => {
      if (isAgentDemo) {
        setMe((prev) => ({
          ...(prev || {}),
          profile: { ...(prev?.profile || {}), ...updates },
        }));
        return;
      }
      if (!auth.currentUser) return;
      saveUserProfile(auth.currentUser.uid, updates).catch(console.warn);
    },
    [isAgentDemo]
  );

  const handleInfographicMergeWrite = useCallback(
    async (payload) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, ...payload };
      setMyData(optimistic);

      if (isAgentDemo || !auth.currentUser) return;

      // Determine touched sections
      const sections = new Set();
      if ("goals" in payload) sections.add("goals");
      if ("categoryBudgets" in payload) sections.add("budgets");
      if ("accounts" in payload || "residualAccountId" in payload) sections.add("accounts");
      if ("allocationRules" in payload) sections.add("allocations");
      if ("income" in payload || "paySchedule" in payload || "extraIncomes" in payload)
        sections.add("income");
      if ("expenses" in payload) sections.add("expenses");
      if ("billSharing" in payload) sections.add("billSharing");
      if ("startingBalance" in payload || "startDate" in payload || "balanceSplit" in payload)
        sections.add("core");

      const sectionList = Array.from(sections);
      if (sectionList.length === 0) {
        await saveUserPartial(auth.currentUser.uid, optimistic);
        return;
      }

      try {
        const newVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          sectionList,
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, ...payload },
            touchedSections: sectionList,
          })
        );
        setMySectionVersions(newVersions);
      } catch (e) {
        console.warn("Merge write failed", e);
        if (e.message === "section-version-conflict") {
          showVersionConflictToast({
            section: e.section,
            serverVersion: e.serverVersion,
            localVersion: e.localVersion,
            retry: () => handleInfographicMergeWrite(payload),
          });
        }
      }
    },
    [myData, mySectionVersions, isAgentDemo, showVersionConflictToast]
  );

  return {
    user,
    me,
    myData,
    household,
    loading,
    hasCached,
    networkError,
    isAgentDemo,
    DEFAULT_STARTING_BALANCE,
    DEFAULT_INCOME,
    DEFAULT_PAY_SCHEDULE,

    // Actions
    handleUpdateBills,
    handleChangeBillAccount,
    handleTogglePaid,
    handleBulkMark,
    handleUpdateAccounts,
    handleUpdateAllocationRules,
    handleUpdateIncomeAndPaySchedule,
    handleUpdateGoals,
    handleUpdateBudgets,
    handleUpdateStartingBalance,
    handleUpdateExpenses,
    handleAddExpense,
    handleUpdateExtraIncome,
    handleUpdateBillSharing,
    handleUpdateProfile,
    handleInfographicMergeWrite,
  };
}