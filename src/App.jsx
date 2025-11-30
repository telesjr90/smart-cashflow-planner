// Updated in Step 2 – Home wired to core financial context
// This file has been modified as part of the Agent Mode tasks to address
// several user-reported issues. Please see the repository history for a
// complete diff. The modifications below increase the z-index on the
// bottom navigation, ensure the buttons are always clickable, and wrap the
// tab change handler in a stable callback to avoid stale closures.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

// A simple error boundary ensures that unexpected runtime errors do not
// surface as blank screens. See src/components/ErrorBoundary.jsx.
import ErrorBoundary from "./components/ErrorBoundary";
import {
  Home as HomeIcon,
  ListChecks,
  Target,
  Settings as SettingsIcon,
  LogOut,
  Wallet,
  CalendarDays,
  ArrowRightLeft,
} from "lucide-react";

import Home from "./pages/Home";
import Bills from "./pages/Bills";
import Planner from "./pages/Planner";
import Settings from "./pages/Settings";
import Accounts from "./pages/Accounts";
import MonthlyCashFlowInfographic from "./MonthlyCashFlowInfographic";
import Expenses from "./pages/Expenses";
import { projectCashflow } from "./lib/cashflowEngine.js";

// Bill sharing helper: preprocess bills according to household rules
import { applyBillSharing } from "./lib/billSharing";

// Components
import AddExpenseModal from "./components/AddExpenseModal";

import { auth, db, loginWithGoogle } from "./firebase";
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

// --- AGENT / DEMO MODE DETECTOR ---
// Example: https://cashflow-a1c11.web.app/?agentDemo=1
const isAgentDemo =
  typeof window !== "undefined" &&
  window.location.search.includes("agentDemo=1");

if (typeof window !== "undefined" && isAgentDemo) {
  // Let existing guards short-circuit backend writes
  // eslint-disable-next-line no-undef
  window.__TEST_USER__ = true;
}

const USERS = "users";

// ---------------- Defaults ----------------
// Neutral defaults for a new plan.  The app should not bootstrap with
// example data – instead, encourage the user to input their real numbers.
const DEFAULT_START_DATE = "2025-11-15";
// Starting balance defaults to zero; the user can set this in Settings.
const DEFAULT_STARTING_BALANCE = 0;
// Balance split defaults to zero for each partner.
const DEFAULT_SPLIT = { husband: 0, wife: 0 };
// Income values represent pay per pay period.  Default to zero to avoid
// projecting phantom income before the user sets their own.
const DEFAULT_INCOME = { husband: 0, wife: 0 };
// Default pay schedule remains semi-monthly with typical days; users can
// customise this later.
const DEFAULT_PAY_SCHEDULE = { type: "semi-monthly", day1: 15, day2: "last" };

const emptyUserData = {
  // Core plan dates
  startDate: DEFAULT_START_DATE,
  startingBalance: DEFAULT_STARTING_BALANCE,
  balanceSplit: { ...DEFAULT_SPLIT },
  // Empty collections; all user-entered
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
  // Income & pay schedule
  income: { ...DEFAULT_INCOME },
  paySchedule: { ...DEFAULT_PAY_SCHEDULE },
  // New bill sharing configuration
  billSharing: {
    mode: "manual",
    percentageSplit: { H: 0.5, W: 0.5 },
    sharedBillIds: [],
  },
  updatedAt: null,
};

const DEFAULT_SECTION_VERSIONS = {
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

const withIds = (arr) =>
  arr.map((b) => ({
    ...b,
    id:
      b.id ||
      `${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${b.dueDay}`,
    accountId: b.accountId || "chequing",
  }));

// -------- date helpers ----------
function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (
    (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth())
  );
}

function getDateStrForMonthIndex(startDate, monthIndex) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(s.getFullYear(), s.getMonth() + monthIndex, 1);
  return d.toISOString().slice(0, 10);
}

// ---------------- Firestore helpers ----------------
async function ensureUserDoc(user) {
  const ref = doc(db, USERS, user.uid);
  if (!navigator.onLine) throw new Error("Offline: cannot ensure user doc");

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Seed a brand new document with profile + blank plan
    const payload = {
      profile: {
        email: user.email || "",
        displayName: user.displayName || "",
        role: "H",
        householdId: user.uid,
      },
      data: { ...emptyUserData },
      dataVersion: 0, // optional global fallback
      sectionVersions: { ...DEFAULT_SECTION_VERSIONS },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload, { merge: true });
  }
}

// Legacy helper (still used for some simple writes, e.g. profile merges)
async function saveUserPartial(uid, partialData) {
  const ref = doc(db, USERS, uid);
  await setDoc(
    ref,
    { data: { ...partialData }, updatedAt: serverTimestamp() },
    { merge: true }
  );
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

// New: per-section transactional save with conflict detection
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

    // 1) Check versions only for the sections we care about
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

    // 2) Compute next data and which sections should be bumped
    const { nextData, touchedSections = sections } = updateFn(serverData) || {};

    // 3) Bump only the touched sections
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

// ---------------- UI helpers ----------------
const Wrapper = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <div className="flex-1 max-w-md mx-auto w-full bg-white shadow-sm border-x border-slate-200 flex flex-col">
      {children}
    </div>
  </div>
);

// ---------------- Tabs ----------------
function Tabs({ current, onChange }) {
  const items = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "planner", label: "Planner", icon: Target },
    { key: "dashboard", label: "Dashboard", icon: CalendarDays },
    { key: "bills", label: "Bills", icon: ListChecks },
    { key: "accounts", label: "Accounts", icon: Wallet },
    { key: "settings", label: "Settings", icon: SettingsIcon },
    { key: "expenses", label: "Expenses", icon: ArrowRightLeft },
  ];

  const handleTabClick = useCallback(
    (key) => {
      if (typeof onChange === "function") {
        onChange(key);
      }
    },
    [onChange]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pointer-events-auto">
      <div className="max-w-md mx-auto flex items-stretch justify-between px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              type="button"
              key={item.key}
              onClick={() => handleTabClick(item.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors ${
                active ? "bg-indigo-50 text-indigo-600" : "text-slate-500"
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------- Main App ----------------
export default function App() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [myData, setMyData] = useState(null);
  const [household, setHousehold] = useState([]);
  const [householdLoading, setHouseholdLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [hasCached, setHasCached] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const [tab, setTab] = useState("home");
  const [settingsSection, setSettingsSection] = useState(null);
  const handleGoToSettingsSection = useCallback((section) => {
    setSettingsSection(section);
    setTab("settings");
  }, []);
  const [personScope, setPersonScope] = useState("self");
  const [mode, setMode] = useState("projected");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [mySectionVersions, setMySectionVersions] = useState(
    DEFAULT_SECTION_VERSIONS
  );

  const userUnsubRef = useRef(null);
  const seededOnce = useRef(false);

  // --- auth & user doc subscription ---
  useEffect(() => {
    // DEMO / AGENT MODE: no Firebase, just in-memory data
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
      return; // ⛔️ do NOT attach onAuthStateChanged in demo mode
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
              allocations:
                sv.allocations ?? DEFAULT_SECTION_VERSIONS.allocations,
              income: sv.income ?? DEFAULT_SECTION_VERSIONS.income,
              billSharing:
                sv.billSharing ?? DEFAULT_SECTION_VERSIONS.billSharing,
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
            // No Firestore doc yet -> start with a blank plan so the UI can render
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
            setMyData(emptyUserData); // Fallback so UI can still render
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    if (isAgentDemo) {
      console.log("Demo mode: logout is a no-op");
      return;
    }
    auth.signOut().catch(console.warn);
  }, []);

  // --- Handlers with per-section conflict detection ---

  const handleUpdateBills = useCallback(
    async (nextBills) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, bills: nextBills };
      setMyData(optimistic);

      // In demo mode, skip backend
      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["bills"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, bills: nextBills },
            touchedSections: ["bills"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to save bills", err);
        if (err.message === "section-version-conflict" && err.section === "bills") {
          alert(
            "Your partner updated Bills while you were editing. We'll reload their latest changes so you can review and reapply yours."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleChangeBillAccount = useCallback(
    async (billId, accountId) => {
      const base = myData || emptyUserData;
      const updatedBills = (base.bills || []).map((b) =>
        b.id === billId ? { ...b, accountId } : b
      );
      const optimistic = { ...base, bills: updatedBills };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["bills"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, bills: updatedBills },
            touchedSections: ["bills"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update bill account", err);
        if (err.message === "section-version-conflict" && err.section === "bills") {
          alert(
            "Your partner updated Bills while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleTogglePaid = useCallback(
    async ({ billId, monthIndex, next }) => {
      const base = myData || emptyUserData;
      const startDate = base.startDate || DEFAULT_START_DATE;
      const dateStr = getDateStrForMonthIndex(startDate, monthIndex);
      const key = `${dateStr}:${billId}`;
      const map = { ...(base.paidBills || {}) };
      if (next) map[key] = true;
      else delete map[key];
      const optimistic = { ...base, paidBills: map };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
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
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to toggle bill paid", err);
        if (err.message === "section-version-conflict" && err.section === "bills") {
          alert(
            "Your partner updated Bills while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleBulkMark = useCallback(
    async ({ billIds, monthIndex, value }) => {
      const base = myData || emptyUserData;
      const startDate = base.startDate || DEFAULT_START_DATE;
      const dateStr = getDateStrForMonthIndex(startDate, monthIndex);
      const optimisticMap = { ...(base.paidBills || {}) };

      billIds.forEach((billId) => {
        const key = `${dateStr}:${billId}`;
        if (value) optimisticMap[key] = true;
        else delete optimisticMap[key];
      });
      const optimistic = { ...base, paidBills: optimisticMap };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
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
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to bulk mark bills", err);
        if (err.message === "section-version-conflict" && err.section === "bills") {
          alert(
            "Your partner updated Bills while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateAccounts = useCallback(
    async (nextAccounts, nextResidualId) => {
      const base = myData || emptyUserData;
      const safeResidual =
        nextResidualId ||
        base.residualAccountId ||
        (nextAccounts[0] && nextAccounts[0].id) ||
        null;
      const optimistic = {
        ...base,
        accounts: nextAccounts,
        residualAccountId: safeResidual,
      };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["accounts"],
          mySectionVersions,
          (serverData) => ({
            nextData: {
              ...serverData,
              accounts: nextAccounts,
              residualAccountId: safeResidual,
            },
            touchedSections: ["accounts"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update accounts", err);
        if (
          err.message === "section-version-conflict" &&
          err.section === "accounts"
        ) {
          alert(
            "Your partner updated Accounts while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateAllocationRules = useCallback(
    async (nextRules) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, allocationRules: nextRules };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["allocations"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, allocationRules: nextRules },
            touchedSections: ["allocations"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update allocation rules", err);
        if (
          err.message === "section-version-conflict" &&
          err.section === "allocations"
        ) {
          alert(
            "Your partner updated allocation rules while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateIncomeAndPaySchedule = useCallback(
    async (nextIncome, nextPaySchedule) => {
      const base = myData || emptyUserData;
      const optimistic = {
        ...base,
        income: nextIncome,
        paySchedule: nextPaySchedule,
      };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["income"],
          mySectionVersions,
          (serverData) => ({
            nextData: {
              ...serverData,
              income: nextIncome,
              paySchedule: nextPaySchedule,
              // extraIncomes stays as-is here
            },
            touchedSections: ["income"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update income/pay schedule", err);
        if (err.message === "section-version-conflict" && err.section === "income") {
          alert(
            "Your partner updated income or pay schedule while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateGoals = useCallback(
    async (newGoals) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, goals: newGoals };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["goals"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, goals: newGoals },
            touchedSections: ["goals"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update goals", err);
        if (err.message === "section-version-conflict" && err.section === "goals") {
          alert(
            "Your partner updated Goals while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateBudgets = useCallback(
    async (newBudgetsObj) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, categoryBudgets: newBudgetsObj };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["budgets"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, categoryBudgets: newBudgetsObj },
            touchedSections: ["budgets"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update budgets", err);
        if (
          err.message === "section-version-conflict" &&
          err.section === "budgets"
        ) {
          alert(
            "Your partner updated Budgets while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateStartingBalance = useCallback(
    async (nextStartingBalance) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, startingBalance: nextStartingBalance };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["core"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, startingBalance: nextStartingBalance },
            touchedSections: ["core"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update starting balance", err);
        if (err.message === "section-version-conflict" && err.section === "core") {
          alert(
            "Your partner updated core plan settings while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateExpenses = useCallback(
    async (nextExpenses) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, expenses: nextExpenses };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["expenses"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, expenses: nextExpenses },
            touchedSections: ["expenses"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update expenses", err);
        if (
          err.message === "section-version-conflict" &&
          err.section === "expenses"
        ) {
          alert(
            "Your partner updated Expenses while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleAddExpense = useCallback(
    (newExpense) => {
      const current = myData?.expenses || [];
      handleUpdateExpenses([...current, newExpense]);
    },
    [myData, handleUpdateExpenses]
  );

  const handleUpdateExtraIncome = useCallback(
    async (newExtraIncomes) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, extraIncomes: newExtraIncomes };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["income"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, extraIncomes: newExtraIncomes },
            touchedSections: ["income"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update extra incomes", err);
        if (err.message === "section-version-conflict" && err.section === "income") {
          alert(
            "Your partner updated income-related data while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateBillSharing = useCallback(
    async (nextBillSharing) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, billSharing: nextBillSharing };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          ["billSharing"],
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, billSharing: nextBillSharing },
            touchedSections: ["billSharing"],
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (err) {
        console.warn("Failed to update bill sharing", err);
        if (
          err.message === "section-version-conflict" &&
          err.section === "billSharing"
        ) {
          alert(
            "Your partner updated bill sharing settings while you were editing. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  const handleUpdateProfile = useCallback((updates) => {
    // In demo mode, update local "me" so UI reflects change
    if (isAgentDemo) {
      setMe((prev) => {
        const prevProfile = prev?.profile || {};
        return {
          ...(prev || {}),
          profile: { ...prevProfile, ...updates },
        };
      });
      return;
    }
    if (!auth.currentUser) return;
    saveUserProfile(auth.currentUser.uid, updates).catch(console.warn);
  }, []);

  const handleInfographicMergeWrite = useCallback(
    async (payload) => {
      const base = myData || emptyUserData;
      const optimistic = { ...base, ...payload };
      setMyData(optimistic);

      // eslint-disable-next-line no-undef
      if (window.__TEST_USER__ || !auth.currentUser) return;

      // Infer which sections are touched by the infographic payload
      const sections = new Set();
      if ("goals" in payload) sections.add("goals");
      if ("categoryBudgets" in payload) sections.add("budgets");
      if ("accounts" in payload || "residualAccountId" in payload)
        sections.add("accounts");
      if ("allocationRules" in payload) sections.add("allocations");
      if (
        "income" in payload ||
        "paySchedule" in payload ||
        "extraIncomes" in payload
      )
        sections.add("income");
      if ("expenses" in payload) sections.add("expenses");
      if ("billSharing" in payload) sections.add("billSharing");
      if (
        "startingBalance" in payload ||
        "startDate" in payload ||
        "balanceSplit" in payload
      )
        sections.add("core");

      const sectionList = Array.from(sections);
      if (sectionList.length === 0) {
        // Fallback: just do a simple merge write
        try {
          await saveUserPartial(auth.currentUser.uid, optimistic);
        } catch (e) {
          console.warn("Failed to sync infographic planning data", e);
        }
        return;
      }

      try {
        const newSectionVersions = await saveUserSectionsWithVersion(
          auth.currentUser.uid,
          sectionList,
          mySectionVersions,
          (serverData) => ({
            nextData: { ...serverData, ...payload },
            touchedSections: sectionList,
          })
        );
        setMySectionVersions(newSectionVersions);
      } catch (e) {
        console.warn("Failed to sync infographic planning data", e);
        if (e.message === "section-version-conflict") {
          alert(
            "Your partner updated some parts of the plan while you were editing the dashboard. We'll reload their latest changes so you can review."
          );
        }
      }
    },
    [myData, mySectionVersions]
  );

  // --- derived values ---
  const canEnter = useMemo(() => !!user, [user]);

  // Unified starting balance across app
  const unifiedStartingBalance = useMemo(() => {
    const acct = myData?.accounts || [];
    if (acct.length > 0) {
      return acct.reduce(
        (sum, a) => sum + (Number(a.openingBalance || 0) || 0),
        0
      );
    }
    return Number(myData?.startingBalance || 0);
  }, [myData?.accounts, myData?.startingBalance]);

  const balances = useMemo(() => {
    const data = myData || emptyUserData;
    const h = data?.balanceSplit?.husband ?? 0;
    const w = data?.balanceSplit?.wife ?? 0;
    return { total: h + w, husband: h, wife: w };
  }, [myData]);

  const role = me?.profile?.role || "H";
  const householdId = me?.profile?.householdId || user?.uid || "";
  const householdCount = Math.max(1, household?.length || 0);

  const paidFlags = useMemo(() => {
    const flags = {};
    const startDate = myData?.startDate || DEFAULT_START_DATE;
    const map = myData?.paidBills || {};
    Object.entries(map).forEach(([key, value]) => {
      if (!value) return;
      const [dateStr, billId] = key.split(":");
      if (!dateStr || !billId) return;
      const monthIndex = getMonthIndexFromStart(startDate, dateStr);
      if (monthIndex < 0 || monthIndex > 120) return;
      if (!flags[billId]) flags[billId] = {};
      flags[billId][monthIndex] = true;
    });
    return flags;
  }, [myData?.paidBills, myData?.startDate]);

  const safeStartDate = useMemo(() => {
    const candidate = myData?.startDate;
    if (candidate) return candidate;
    return new Date().toISOString().slice(0, 10);
  }, [myData?.startDate]);
  const startDate = safeStartDate;

  const accounts = useMemo(() => {
    const acct = myData?.accounts;
    if (acct && acct.length > 0) {
      return acct;
    }
    return [
      {
        id: "chequing",
        name: "Chequing",
        type: "deposit",
        openingBalance: unifiedStartingBalance,
      },
    ];
  }, [myData?.accounts, unifiedStartingBalance]);

  const allocationRules = myData?.allocationRules || [];
  const residualAccountId = myData?.residualAccountId || accounts[0]?.id;

  const income = useMemo(
    () => ({
      husband: Number(myData?.income?.husband || DEFAULT_INCOME.husband),
      wife: Number(myData?.income?.wife || DEFAULT_INCOME.wife),
    }),
    [myData]
  );

  const paySchedule = useMemo(
    () => myData?.paySchedule || DEFAULT_PAY_SCHEDULE,
    [myData]
  );

  const extraIncomes = useMemo(
    () => myData?.extraIncomes || [],
    [myData]
  );

  // Preprocess bills according to household bill sharing settings before
  // downstream consumers and the engine see them.
  const processedBills = useMemo(() => {
    if (!myData) return [];
    try {
      return applyBillSharing({
        bills: myData.bills || [],
        income,
        billSharing: myData.billSharing,
        paySchedule,
      });
    } catch (e) {
      console.warn("applyBillSharing failed", e);
      return myData.bills || [];
    }
  }, [myData, income, paySchedule]);

  const householdBills = useMemo(() => {
    if (!household || household.length === 0) return [];
    const merged = [];
    household.forEach((member) => {
      const data = member?.data || {};
      const bills = withIds(data.bills || []);
      bills.forEach((b) => {
        merged.push({
          ...b,
          ownerUid: member.uid,
          ownerRole: member.profile?.role || "H",
        });
      });
    });
    return merged;
  }, [household]);

  const displayedBills = useMemo(() => {
    if (householdBills.length > 0) return householdBills;
    const self = myData?.bills || [];
    return self.map((b) => ({
      ...b,
      ownerUid: user?.uid,
      ownerRole: role,
    }));
  }, [householdBills, myData, user, role]);

  // Summary of current month for Home banner
  const homeCashflowSummary = useMemo(() => {
    const data = myData || emptyUserData;
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthIndex = getMonthIndexFromStart(safeStartDate, todayStr);
    const months = Math.max(1, monthIndex + 1);
    try {
      // run projection separately for projected and actual modes
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
          paidBills: data.paidBills || {},
          extraIncomes: data.extraIncomes || [],
          expenses: data.expenses || [],
          mode: m,
        });
      const projProjected = runProjection("projected");
      const projActual = runProjection("actual");
      const monthSummaryProjected =
        (projProjected.monthlySummary || [])[monthIndex] || null;
      const monthSummaryActual =
        (projActual.monthlySummary || [])[monthIndex] || null;
      return { projected: monthSummaryProjected, actual: monthSummaryActual };
    } catch (e) {
      console.warn("homeCashflowSummary failed", e);
      return null;
    }
  }, [
    myData,
    safeStartDate,
    accounts,
    displayedBills,
    income,
    paySchedule,
    allocationRules,
    residualAccountId,
  ]);


  // Budgets summary for Home
  const budgetListForHome = useMemo(() => {
    const raw = myData?.categoryBudgets || {};
    const expenses = myData?.expenses || [];

    // Determine which month the Home view is showing.
    const startDateStr = safeStartDate; // already computed above
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthIndex = getMonthIndexFromStart(startDateStr, todayStr);

    // Aggregate expenses for the current month by category key
    const spentByCategory = {};
    for (const exp of expenses) {
      const dateStr = exp.date || exp.dateStr;
      if (!dateStr) continue;
      const mIdx = getMonthIndexFromStart(startDateStr, dateStr);
      if (mIdx !== currentMonthIndex) continue;

      const catKey = exp.category || exp.categoryId || "uncategorized";
      const value = Number(exp.amount || 0) || 0;
      if (!spentByCategory[catKey]) spentByCategory[catKey] = 0;
      spentByCategory[catKey] += value;
    }

    const list = [];

    Object.entries(raw).forEach(([cat, cfg]) => {
      const status = cfg?.status || "active";
      if (status !== "active") return;

      // Budgeted amount – either per-partner contributions or a single amount
      let total = 0;
      if (cfg?.contributions && typeof cfg.contributions === "object") {
        total = (cfg.contributions.H || 0) + (cfg.contributions.W || 0);
      } else {
        total = cfg?.amount || 0;
      }

      // Skip zero-amount budgets from the Home list
      if (!total) return;

      const spent = spentByCategory[cat] || 0;
      const remaining = total - spent;

      list.push({
        id: cat,
        name: cfg?.label || cat,
        total,
        spent,
        remaining,
      });
    });

    return list;
  }, [myData?.categoryBudgets, myData?.expenses, safeStartDate]);

  const savingsToDate = useMemo(
    () =>
      (myData?.goals || []).reduce((acc, g) => acc + (g.savedSoFar || 0), 0),
    [myData?.goals]
  );

  const pendingSharedGoalsForMe = useMemo(
    () =>
      (myData?.goals || []).filter(
        (g) => g?.status === "pending" && g?.pendingFor === role
      ).length,
    [myData?.goals, role]
  );

  const pendingSharedBudgetsForMe = useMemo(() => {
    const raw = myData?.categoryBudgets || {};
    return Object.values(raw).filter(
      (b) => b?.status === "pending" && b?.pendingFor === role
    ).length;
  }, [myData?.categoryBudgets, role]);

  if (loading && !hasCached) {
    return (
      <ErrorBoundary>
        <Wrapper>
          <div className="p-6 text-sm text-slate-600">Loading...</div>
        </Wrapper>
      </ErrorBoundary>
    );
  }

  if (isAgentDemo && !canEnter) {
    return (
      <ErrorBoundary>
        <Wrapper>
          <div className="p-6 text-sm text-slate-600">Loading demo mode...</div>
        </Wrapper>
      </ErrorBoundary>
    );
  }

  if (!canEnter) {
    return (
      <ErrorBoundary>
        <Wrapper>
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 gap-4">
            <div className="text-center space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Smart Cash Flow Planner
              </div>
              <div className="text-lg font-semibold text-slate-900">
                Sign in to continue
              </div>
              <p className="text-xs text-slate-500">
                Connect with your Google account to load your household plan and
                sync changes across devices.
              </p>
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
            >
              Sign in with Google
            </button>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              Your data is stored securely in Firebase and can be unlinked at
              any time.
            </p>
          </div>
        </Wrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Wrapper>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-indigo-600" size={18} />
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Smart Cash Flow Planner
              </div>
              <div className="text-xs font-semibold text-slate-900">
                Hi{" "}
                {me?.profile?.displayName?.split(" ")[0] ||
                  user?.displayName?.split(" ")[0] ||
                  "there"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <LogOut size={16} />
          </button>
        </div>

        {tab === "home" && (
          <Home
            role={role}
            personScope={personScope}
            setPersonScope={setPersonScope}
            startDate={startDate}
            bills={displayedBills}
            paidFlags={paidFlags}
            mode={mode}
            setMode={setMode}
            income={income}
            paySchedule={paySchedule}
            accounts={accounts}
            allocationRules={allocationRules}
            residualAccountId={residualAccountId}
            startingBalance={
              myData?.startingBalance ?? DEFAULT_STARTING_BALANCE
            }
            budgets={budgetListForHome}
            savingsToDate={savingsToDate}
            onAddExpense={() => setIsExpenseModalOpen(true)}
            expenses={myData?.expenses || []}
            onGoToSettings={() => setTab("settings")}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToBills={() => setTab("bills")}
            pendingGoalsCount={pendingSharedGoalsForMe}
            pendingBudgetsCount={pendingSharedBudgetsForMe}
            onGoToReviewPending={() => {
              if (pendingSharedGoalsForMe > 0) {
                handleGoToSettingsSection("goals");
              } else if (pendingSharedBudgetsForMe > 0) {
                handleGoToSettingsSection("budgets");
              } else {
                handleGoToSettingsSection("goals");
              }
            }}
            homeCashflowSummary={homeCashflowSummary}

          />
        )}

        {tab === "planner" && (
          <Planner
            role={role}
            personScope={personScope}
            startDate={startDate}
            bills={displayedBills}
            paidBills={myData?.paidBills || {}}
            mode={mode}
            setMode={setMode}
            accounts={accounts}
            allocationRules={allocationRules}
            residualAccountId={residualAccountId}
            income={income}
            paySchedule={paySchedule}
            extraIncomes={extraIncomes}
            expenses={myData?.expenses || []}
          />
        )}

        {tab === "dashboard" && (
          <MonthlyCashFlowInfographic
            uid={user?.uid}
            role={role}
            personScope={personScope}
            liveStartDate={startDate}
            liveIncome={income}
            livePaySchedule={paySchedule}
            liveBills={displayedBills}
            liveAccounts={accounts}
            liveStartingBalance={unifiedStartingBalance}
            liveAllocationRules={allocationRules}
            liveGoals={myData?.goals || []}
            liveCategoryBudgets={myData?.categoryBudgets || {}}
            paidBills={paidFlags}
            mergeWrite={handleInfographicMergeWrite}
            liveExtraIncomes={extraIncomes}
            onUpdateExtraIncomes={handleUpdateExtraIncome}
            liveExpenses={myData?.expenses || []}
            mode={mode}
            setMode={setMode}
          />
        )}

        {tab === "bills" && (
          <Bills
            role={role}
            startDate={startDate}
            bills={displayedBills}
            paidFlags={paidFlags}
            personScope={personScope}
            accounts={accounts}
            residualAccountId={residualAccountId}
            onTogglePaid={handleTogglePaid}
            onBulkMark={handleBulkMark}
            onChangeBillAccount={handleChangeBillAccount}
            onUpdateBills={handleUpdateBills}
          />
        )}

        {tab === "settings" && (
          <Settings
            uid={user?.uid}
            email={me?.profile?.email || user.email || ""}
            displayName={me?.profile?.displayName || user.displayName || ""}
            role={role}
            householdId={householdId}
            householdCount={householdCount}
            onUpdateProfile={handleUpdateProfile}
            balances={balances}
            startDate={startDate}
            startingBalance={myData?.startingBalance ?? DEFAULT_STARTING_BALANCE}
            accounts={accounts}
            bills={myData?.bills || []}
            residualAccountId={residualAccountId}
            allocationRules={allocationRules}
            income={income}
            paySchedule={paySchedule}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateBills={handleUpdateBills}
            onUpdateAllocationRules={handleUpdateAllocationRules}
            onUpdateIncomeAndPaySchedule={handleUpdateIncomeAndPaySchedule}
            goals={myData?.goals || []}
            categoryBudgets={myData?.categoryBudgets || {}}
            onUpdateGoals={handleUpdateGoals}
            onUpdateBudgets={handleUpdateBudgets}
            onUpdateStartingBalance={handleUpdateStartingBalance}
            billSharing={myData?.billSharing}
            onUpdateBillSharing={handleUpdateBillSharing}
            scrollToSection={settingsSection}
            onResetScrollHint={() => setSettingsSection(null)}
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
            expenses={myData?.expenses || []}
            goals={myData?.goals || []}
            categoryBudgets={myData?.categoryBudgets || {}}
            startDate={startDate}
            paidBills={myData?.paidBills || {}}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateAllocationRules={handleUpdateAllocationRules}
            onUpdateIncomeAndPaySchedule={handleUpdateIncomeAndPaySchedule}
            onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
            onGoToSettingsGoals={() => handleGoToSettingsSection("goals")}
          />
        )}

        {tab === "expenses" && (
          <Expenses
            expenses={myData?.expenses || []}
            accounts={accounts}
            onUpdateExpenses={handleUpdateExpenses}
          />
        )}

        <Tabs current={tab} onChange={setTab} />

        <AddExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={handleAddExpense}
          accounts={accounts}
        />
      </Wrapper>
    </ErrorBoundary>
  );
}
