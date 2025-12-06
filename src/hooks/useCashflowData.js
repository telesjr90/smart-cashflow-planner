// File: src/hooks/useCashflowData.js
import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { getDefaultPlannerStartDate } from "../lib/cashflow/index.js";

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

async function saveUserSectionsWithVersion(
  uid,
  sections,
  localSectionVersions,
  updateFn
) {
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
    const res = await getDocs(collection(db, USERS));
    const all = [];
    res.forEach((d) => all.push({ id: d.id, ...d.data() }));
    const mine = all.find((u) => u.id === currentUserUid);
    const householdId = mine?.profile?.householdId || currentUserUid;
    return all
      .filter((u) => u.profile?.householdId === householdId)
      .map((u) => ({ ...u, uid: u.id }));
  } catch (e) {
    console.warn("loadHouseholdMembers failed", e);
    return [];
  }
}

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
  
  const [mySectionVersions, setMySectionVersions] = useState(
    DEFAULT_SECTION_VERSIONS
  );

  const userUnsubRef = useRef(null);
  const seededOnce = useRef(false);

  // Check for Agent Demo mode
  const isAgentDemo =
    typeof window !== "undefined" &&
    window.location.search.includes("agentDemo=1");

  if (typeof window !== "undefined" && isAgentDemo) {
    // eslint-disable-next-line no-undef
    window.__TEST_USER__ = true;
  }

  // Auth & Subscription Effect
  useEffect(() => {
    if (isAgentDemo) {
      const demoUser = { uid: "demo-user", displayName: "Agent Demo" };
      setUser(demoUser);
      setMe({
        profile: {
          email: "demo@example.com",
          displayName: "Agent Demo",
          role: "H",
          householdId: "demo-household",
        },
        data: { ...emptyUserData },
        sectionVersions: { ...DEFAULT_SECTION_VERSIONS },
      });
      setMyData({ ...emptyUserData });
      setMySectionVersions({ ...DEFAULT_SECTION_VERSIONS });
      setHousehold([]);
      setLoading(false);
      setHasCached(true);
      return;
    }

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
          if (!myData) {
            setMyData(emptyUserData);
          }
          setMySectionVersions({ ...DEFAULT_SECTION_VERSIONS });
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

  const handleUpdateBills = useCallback(async (nextBills) => {
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
        alert("Conflict detected: Bills updated by partner. Reloading...");
      }
    }
  }, [myData, mySectionVersions, isAgentDemo]);

  const handleChangeBillAccount = useCallback(async (billId, accountId) => {
    const base = myData || emptyUserData;
    const updatedBills = (base.bills || []).map((b) =>
      b.id === billId ? { ...b, accountId } : b
    );
    // Reuse handleUpdateBills logic
    await handleUpdateBills(updatedBills);
  }, [myData, handleUpdateBills]);

  const handleTogglePaid = useCallback(async ({ billId, monthIndex, next }) => {
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
    }
  }, [myData, mySectionVersions, isAgentDemo]);

  const handleBulkMark = useCallback(async ({ billIds, monthIndex, value }) => {
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
    }
  }, [myData, mySectionVersions, isAgentDemo]);

  // Generic handler creator for simple section updates
  const createUpdateHandler = (sectionName, keyInState) => async (newValue, extraArg) => {
    const base = myData || emptyUserData;
    const optimistic = { ...base, [keyInState]: newValue };
    // Handle special case for accounts residual ID
    if (keyInState === 'accounts' && extraArg !== undefined) {
       optimistic.residualAccountId = extraArg || base.residualAccountId || (newValue[0]?.id) || null;
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
          if (keyInState === 'accounts') {
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
        alert(`Conflict: ${sectionName} updated by partner. Reloading...`);
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

  const handleAddExpense = useCallback((newExpense) => {
    const current = myData?.expenses || [];
    handleUpdateExpenses([...current, newExpense]);
  }, [myData, handleUpdateExpenses]);

  const handleUpdateIncomeAndPaySchedule = useCallback(async (nextIncome, nextPaySchedule) => {
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
    } catch (err) { console.warn("Income update failed", err); }
  }, [myData, mySectionVersions, isAgentDemo]);

  const handleUpdateProfile = useCallback((updates) => {
    if (isAgentDemo) {
      setMe((prev) => ({
        ...(prev || {}),
        profile: { ...(prev?.profile || {}), ...updates },
      }));
      return;
    }
    if (!auth.currentUser) return;
    saveUserProfile(auth.currentUser.uid, updates).catch(console.warn);
  }, [isAgentDemo]);

  const handleInfographicMergeWrite = useCallback(async (payload) => {
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
    if ("income" in payload || "paySchedule" in payload || "extraIncomes" in payload) sections.add("income");
    if ("expenses" in payload) sections.add("expenses");
    if ("billSharing" in payload) sections.add("billSharing");
    if ("startingBalance" in payload || "startDate" in payload || "balanceSplit" in payload) sections.add("core");

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
    }
  }, [myData, mySectionVersions, isAgentDemo]);

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