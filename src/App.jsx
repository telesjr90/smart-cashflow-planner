// src/App.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

// Pull in dayjs for robust date handling. It gracefully falls back to the
// current date when given undefined input. Without this import the app
// would crash on the first bill entry when startDate is missing.

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
  Users2,
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
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// --- AGENT / DEMO MODE DETECTOR ---
// Example: https://cashflow-a1c11.web.app/?agentDemo=1
const isAgentDemo =
  typeof window !== "undefined" &&
  window.location.search.includes("agentDemo=1");

if (typeof window !== "undefined" && isAgentDemo) {
  // Let existing guards short-circuit backend writes
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload, { merge: true });
  }
}

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

  return (
    <nav className="sticky bottom-0 z-40 bg-white border-t border-slate-200">
      <div className="max-w-md mx-auto flex items-stretch justify-between px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
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
  // Section hint for navigating to specific settings sections. When navigating
  // from other pages (e.g. Accounts) we capture which section should be
  // focused and then scroll to it in Settings.jsx via scrollIntoView.
  const [settingsSection, setSettingsSection] = useState(null);
  const handleGoToSettingsSection = useCallback(
    (section) => {
      setSettingsSection(section);
      setTab("settings");
    },
    []
  );
  const [personScope, setPersonScope] = useState("self");
  const [mode, setMode] = useState("projected");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

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
      });
      setMyData({ ...emptyUserData });
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

  const logout = useCallback(() => {
    if (isAgentDemo) {
      console.log("Demo mode: logout is a no-op");
      return;
    }
    auth.signOut().catch(console.warn);
  }, []);

  // --- Handlers ---
  const handleUpdateBills = useCallback(
    (nextBills) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, bills: nextBills };
      // Always update local state so UI reflects change
      setMyData(nextData);
      // In demo mode, skip backend
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleChangeBillAccount = useCallback(
    (billId, accountId) => {
      const base = myData || emptyUserData;
      const updatedBills = (base.bills || []).map((b) =>
        b.id === billId ? { ...b, accountId } : b
      );
      const nextData = { ...base, bills: updatedBills };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleTogglePaid = useCallback(
    ({ billId, monthIndex, next }) => {
      const base = myData || emptyUserData;
      const startDate = base.startDate || DEFAULT_START_DATE;
      const dateStr = getDateStrForMonthIndex(startDate, monthIndex);
      const key = `${dateStr}:${billId}`;
      const map = { ...(base.paidBills || {}) };
      if (next) map[key] = true;
      else delete map[key];
      const nextData = { ...base, paidBills: map };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleBulkMark = useCallback(
    ({ billIds, monthIndex, value }) => {
      const base = myData || emptyUserData;
      const startDate = base.startDate || DEFAULT_START_DATE;
      const dateStr = getDateStrForMonthIndex(startDate, monthIndex);
      const map = { ...(base.paidBills || {}) };
      billIds.forEach((billId) => {
        const key = `${dateStr}:${billId}`;
        if (value) map[key] = true;
        else delete map[key];
      });
      const nextData = { ...base, paidBills: map };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateAccounts = useCallback(
    (nextAccounts, nextResidualId) => {
      const base = myData || emptyUserData;
      const safeResidual =
        nextResidualId ||
        base.residualAccountId ||
        (nextAccounts[0] && nextAccounts[0].id) ||
        null;
      const nextData = {
        ...base,
        accounts: nextAccounts,
        residualAccountId: safeResidual,
      };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateAllocationRules = useCallback(
    (nextRules) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, allocationRules: nextRules };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateIncomeAndPaySchedule = useCallback(
    (nextIncome, nextPaySchedule) => {
      const base = myData || emptyUserData;
      const nextData = {
        ...base,
        income: nextIncome,
        paySchedule: nextPaySchedule,
      };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateGoals = useCallback(
    (newGoals) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, goals: newGoals };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateBudgets = useCallback(
    (newBudgetsObj) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, categoryBudgets: newBudgetsObj };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateStartingBalance = useCallback(
    (nextStartingBalance) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, startingBalance: nextStartingBalance };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  // Central update handler for expenses
  const handleUpdateExpenses = useCallback(
    (nextExpenses) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, expenses: nextExpenses };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleAddExpense = useCallback(
    (newExpense) => {
      // Delegate to handleUpdateExpenses for consistent update logic
      const current = myData?.expenses || [];
      handleUpdateExpenses([...current, newExpense]);
    },
    [myData, handleUpdateExpenses]
  );

  const handleUpdateExtraIncome = useCallback(
    (newExtraIncomes) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, extraIncomes: newExtraIncomes };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch(console.warn);
    },
    [myData]
  );

  const handleUpdateBillSharing = useCallback(
    (nextBillSharing) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, billSharing: nextBillSharing };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      saveUserPartial(auth.currentUser.uid, nextData).catch((e) =>
        console.warn("Failed to update bill sharing", e)
      );
    },
    [myData]
  );

  const handleUpdateProfile = useCallback(
    (updates) => {
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
    },
    []
  );

  const handleInfographicMergeWrite = useCallback(
    async (payload) => {
      const base = myData || emptyUserData;
      const nextData = { ...base, ...payload };
      setMyData(nextData);
      if (window.__TEST_USER__) return;
      if (!auth.currentUser) return;
      try {
        await saveUserPartial(auth.currentUser.uid, nextData);
      } catch (e) {
        console.warn("Failed to sync infographic planning data", e);
      }
    },
    [myData]
  );

  // --- derived values ---
  const canEnter = useMemo(() => !!user, [user]);

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

  // Determine a safe starting date. If the user hasn't specified a
  // startDate yet (e.g. when first adding a bill), fall back to
  // today's date instead of the hard-coded DEFAULT_START_DATE to
  // prevent crashes in downstream date computations. dayjs formats
  // consistently as YYYY-MM-DD.
  const safeStartDate = useMemo(() => {
    const candidate = myData?.startDate;
    if (candidate) return candidate;
    // Fall back to today in YYYY-MM-DD format. Use native Date API to
    // avoid bringing in external dependencies.
    return new Date().toISOString().slice(0, 10);
  }, [myData?.startDate]);
  const startDate = safeStartDate;
  const accounts = useMemo(
    () =>
      myData?.accounts || [
        {
          id: "chequing",
          name: "Chequing",
          type: "deposit",
          openingBalance:
            myData?.startingBalance ?? DEFAULT_STARTING_BALANCE,
        },
      ],
    [myData]
  );
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

  const budgetListForHome = useMemo(() => {
    const raw = myData?.categoryBudgets || {};
    return Object.entries(raw).map(([cat, cfg]) => ({
      id: cat,
      name: cfg?.label || cat,
      remaining: cfg?.amount || 0,
      total: cfg?.amount || 0,
    }));
  }, [myData?.categoryBudgets]);

  const savingsToDate = useMemo(
    () =>
      (myData?.goals || []).reduce(
        (acc, g) => acc + (g.savedSoFar || 0),
        0
      ),
    [myData?.goals]
  );

  if (loading && !hasCached) {
    return (
      <ErrorBoundary>
        <Wrapper>
          <div className="p-6 text-sm text-slate-600">Loading...</div>
        </Wrapper>
      </ErrorBoundary>
    );
  }

  // In demo mode, if some race leaves us without user yet, show a safe loader
  if (isAgentDemo && !canEnter) {
    return (
      <ErrorBoundary>
        <Wrapper>
          <div className="p-6 text-sm text-slate-600">
            Loading demo mode...
          </div>
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
              Your data is stored securely in Firebase and can be unlinked at any
              time.
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
          budgets={budgetListForHome}
          savingsToDate={savingsToDate}
          onAddExpense={() => setIsExpenseModalOpen(true)}
          expenses={myData?.expenses || []}
          onGoToSettings={() => setTab("settings")}
          onGoToSettingsBudgets={() => handleGoToSettingsSection("budgets")}
          onGoToBills={() => setTab("bills")}
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
          liveGoals={myData?.goals || []}
          liveCategoryBudgets={myData?.categoryBudgets || {}}
          paidBills={paidFlags}
          mergeWrite={handleInfographicMergeWrite}
          liveExtraIncomes={extraIncomes}
          onUpdateExtraIncomes={handleUpdateExtraIncome}
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
          displayName={
            me?.profile?.displayName || user.displayName || ""
          }
          role={role}
          householdId={householdId}
          householdCount={householdCount}
          onUpdateProfile={handleUpdateProfile}
          balances={balances}
          startDate={startDate}
          startingBalance={
            myData?.startingBalance ?? DEFAULT_STARTING_BALANCE
          }
          accounts={accounts}
          residualAccountId={residualAccountId}
          allocationRules={allocationRules}
          income={income}
          paySchedule={paySchedule}
          onUpdateAccounts={handleUpdateAccounts}
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
