import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";

// Provide a stable React mock up-front so zustand/react hooks don't try to use real React
vi.mock("react", () => {
  const createContext = (val) => ({ _value: val, Provider: ({ children }) => children });
  const useContext = (ctx) => ctx?._value ?? null;
  const React = {
    useEffect: (fn) => fn(),
    useLayoutEffect: (fn) => fn(),
    useRef: (val) => ({ current: val }),
    useState: (val) => [val, () => {}],
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot?.(),
    useDebugValue: () => {},
    createContext,
    useContext,
    Fragment: ({ children }) => children,
  };
  return { ...React, default: React };
});

describe("Firestore listener duplication guard", () => {
  let snapshotCount;
  let mockState;
  let hasHydratedCalled;

  beforeEach(() => {
    snapshotCount = 0;
    hasHydratedCalled = false;
    vi.resetModules();

    // Mock firebase/app surface used by hooks
    vi.doMock("../../src/firebase", () => ({
      auth: {},
      db: {},
    }));

    // Mock firebase/auth to immediately invoke auth callback
    vi.doMock("firebase/auth", () => ({
      getAuth: vi.fn(() => ({})),
      GoogleAuthProvider: vi.fn(),
      signInWithPopup: vi.fn(() => Promise.resolve({})),
      signOut: vi.fn(() => Promise.resolve()),
      onAuthStateChanged: vi.fn((auth, cb) => {
        cb({ uid: "user-1", email: "test@example.com", displayName: "Test User" });
        return vi.fn();
      }),
    }));

    // Mock firebase/firestore to count onSnapshot registrations
    vi.doMock("firebase/firestore", () => ({
      getFirestore: vi.fn(() => ({})),
      enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
      doc: vi.fn((db, col, id) => ({ db, col, id })),
      onSnapshot: vi.fn((ref, onNext) => {
        snapshotCount += 1;
        onNext({
          exists: () => true,
          data: () => ({ profile: {}, data: {} }),
        });
        return vi.fn();
      }),
    }));

    // Mock toast hook to avoid provider requirement
    vi.doMock("../../src/components/ui/toast/useToast.js", () => ({
      useToast: () => ({ toast: vi.fn() }),
      default: () => ({ toast: vi.fn() }),
    }));

    // Mock zustand store hook to avoid real React hook calls
    vi.doMock("../../src/store/useCashflowStore.js", () => {
      mockState = {
        setUserProfile: vi.fn(),
        setFullPlanData: vi.fn(() => {
          if (!hasHydratedCalled) {
            mockState.setHasHydrated();
            hasHydratedCalled = true;
          }
        }),
        reset: vi.fn(),
        setHasHydrated: vi.fn(() => {
          hasHydratedCalled = true;
        }),
        startDate: "2025-01-01",
        startingBalance: 0,
        accounts: [],
        bills: [],
        goals: [],
        categoryBudgets: {},
        extraIncomes: [],
        allocationRules: [],
        paidBills: {},
        income: {},
        paySchedule: {},
        billSharing: {},
        expenses: [],
        mode: "planned",
      };
      const useCashflowStore = (selector) =>
        typeof selector === "function" ? selector(mockState) : mockState;
      useCashflowStore.getState = () => mockState;
      return { useCashflowStore, default: useCashflowStore };
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("registers a single onSnapshot when both modules subscribe", async () => {
    const { useFirebaseSync } = await import("../../src/hooks/useFirebaseSync.js");
    const useCashflowData = (await import("../../src/hooks/useCashflowData.js")).default;

    useFirebaseSync();
    useCashflowData();

    expect(snapshotCount).toBe(1);
    expect(mockState.setHasHydrated).toHaveBeenCalledTimes(1);
    expect(hasHydratedCalled).toBe(true);
  });

  it("actions-only cashflow data (subscribe=false) does not add another onSnapshot and hydrates once", async () => {
    const { useFirebaseSync } = await import("../../src/hooks/useFirebaseSync.js");
    const useCashflowData = (await import("../../src/hooks/useCashflowData.js")).default;

    // Mount hydrator (should register a snapshot)
    useFirebaseSync();
    // Mount actions-only hook (subscribe: false) — should not register another snapshot
    useCashflowData({ subscribe: false });

    expect(snapshotCount).toBe(1);
    expect(mockState.setHasHydrated).toHaveBeenCalledTimes(1);
    expect(mockState.setFullPlanData).toHaveBeenCalledTimes(1);
    expect(hasHydratedCalled).toBe(true);
  });
});
