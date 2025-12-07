import { create } from "zustand";
import { persist } from "zustand/middleware";
import { indexedDbStorage } from "./storage";

const initialPlannerSettings = {
  currency: "USD",
  locale: "en-US",
  startDate: null,
  timezone: "UTC",
};

const initialState = {
  hasHydrated: false,
  accounts: [],
  transactions: [],
  recurringBills: [],
  plannerSettings: { ...initialPlannerSettings },
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const normalizeId = (id) => {
  if (id === undefined || id === null) return null;
  return String(id);
};

const normalizeAccounts = (accounts = []) =>
  (Array.isArray(accounts) ? accounts : [])
    .filter(Boolean)
    .map((account) => {
      const normalizedId = normalizeId(account?.id);
      return {
        ...account,
        id: normalizedId ?? account?.id ?? undefined,
        openingBalance: Number(account?.openingBalance ?? account?.balance ?? 0),
      };
    });

const normalizeTransactions = (transactions = []) =>
  (Array.isArray(transactions) ? transactions : [])
    .filter(Boolean)
    .map((tx) => ({
      ...tx,
      id: normalizeId(tx?.id) ?? tx?.id ?? undefined,
      date: normalizeDateValue(tx?.date),
      postedAt: normalizeDateValue(tx?.postedAt),
      amount: Number(tx?.amount ?? 0),
    }));

const normalizeRecurringBills = (recurringBills = []) =>
  (Array.isArray(recurringBills) ? recurringBills : [])
    .filter(Boolean)
    .map((bill) => ({
      ...bill,
      id: normalizeId(bill?.id) ?? bill?.id ?? undefined,
      startDate: normalizeDateValue(bill?.startDate),
      endDate: normalizeDateValue(bill?.endDate),
      amount: Number(bill?.amount ?? 0),
    }));

const normalizePlannerSettings = (plannerSettings = {}) => ({
  ...initialPlannerSettings,
  ...(plannerSettings || {}),
  startDate: normalizeDateValue(plannerSettings?.startDate),
});

const normalizePersistedState = (state = {}) => ({
  accounts: normalizeAccounts(state.accounts),
  transactions: normalizeTransactions(state.transactions),
  recurringBills: normalizeRecurringBills(state.recurringBills),
  plannerSettings: normalizePlannerSettings(state.plannerSettings),
});

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setHasHydrated: (hasHydrated = true) => set({ hasHydrated }),
      hydrateFromPersist: (partialState) =>
        set((current) => ({ ...current, ...partialState })),

      // Accounts
      setAccounts: (accounts = []) => set({ accounts: normalizeAccounts(accounts) }),
      addAccount: (account) =>
        set((state) => ({
          accounts: normalizeAccounts([...(state.accounts || []), account]),
        })),
      updateAccount: (id, updates = {}) =>
        set((state) => ({
          accounts: normalizeAccounts(
            (state.accounts || []).map((account) =>
              (account.id ?? account?.id) === id ? { ...account, ...updates } : account
            )
          ),
        })),
      removeAccount: (id) =>
        set((state) => ({
          accounts: (state.accounts || []).filter(
            (account) => (account.id ?? account?.id) !== id
          ),
        })),

      // Transactions
      setTransactions: (transactions = []) =>
        set({ transactions: normalizeTransactions(transactions) }),
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: normalizeTransactions([
            ...(state.transactions || []),
            transaction,
          ]),
        })),
      updateTransaction: (id, updates = {}) =>
        set((state) => ({
          transactions: normalizeTransactions(
            (state.transactions || []).map((tx) =>
              (tx.id ?? tx?.id) === id ? { ...tx, ...updates } : tx
            )
          ),
        })),
      removeTransaction: (id) =>
        set((state) => ({
          transactions: (state.transactions || []).filter(
            (tx) => (tx.id ?? tx?.id) !== id
          ),
        })),

      // Recurring bills
      setRecurringBills: (recurringBills = []) =>
        set({ recurringBills: normalizeRecurringBills(recurringBills) }),
      addRecurringBill: (bill) =>
        set((state) => ({
          recurringBills: normalizeRecurringBills([
            ...(state.recurringBills || []),
            bill,
          ]),
        })),
      updateRecurringBill: (id, updates = {}) =>
        set((state) => ({
          recurringBills: normalizeRecurringBills(
            (state.recurringBills || []).map((bill) =>
              (bill.id ?? bill?.id) === id ? { ...bill, ...updates } : bill
            )
          ),
        })),
      removeRecurringBill: (id) =>
        set((state) => ({
          recurringBills: (state.recurringBills || []).filter(
            (bill) => (bill.id ?? bill?.id) !== id
          ),
        })),

      // Planner settings
      setPlannerSettings: (nextSettings = {}) =>
        set({ plannerSettings: normalizePlannerSettings(nextSettings) }),
      updatePlannerSettings: (partial = {}) =>
        set((state) => ({
          plannerSettings: normalizePlannerSettings({
            ...state.plannerSettings,
            ...partial,
          }),
        })),

      // Selectors
      getAccountById: (id) =>
        (get().accounts || []).find((account) => (account.id ?? account?.id) === id) || null,
      getTransactionById: (id) =>
        (get().transactions || []).find((tx) => (tx.id ?? tx?.id) === id) || null,
      getRecurringBillById: (id) =>
        (get().recurringBills || []).find((bill) => (bill.id ?? bill?.id) === id) || null,

      reset: () => set({ ...initialState, hasHydrated: true }),
    }),
    {
      name: "planner-storage",
      storage: indexedDbStorage,
      partialize: (state) => ({
        accounts: state.accounts,
        transactions: state.transactions,
        recurringBills: state.recurringBills,
        plannerSettings: state.plannerSettings,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[useStore] rehydrate failed", error);
        }
        if (state?.hydrateFromPersist) {
          state.hydrateFromPersist(normalizePersistedState(state));
        }
        state?.setHasHydrated?.(true);
      },
    }
  )
);

export default useStore;
