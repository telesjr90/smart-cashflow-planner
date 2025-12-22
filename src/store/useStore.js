import { create } from "zustand";
import { persist } from "zustand/middleware";

import { indexedDBStorage } from "./storage";
import { getDefaultPlannerStartDate } from "../lib/cashflow";

const INITIAL_STATE = {
  // User Profile
  userProfile: {
    uid: null,
    email: null,
    displayName: null,
    role: "H",
    householdId: null,
  },

  // Core Plan Data
  startDate: getDefaultPlannerStartDate(),
  startingBalance: 0,

  // Entities
  accounts: [],
  bills: [],
  recurringBills: [],
  expenses: [],
  transactions: [],
  goals: [],
  categoryBudgets: {},
  extraIncomes: [],
  allocationRules: [],

  // Configuration
  income: { husband: 0, wife: 0 },
  paySchedule: { type: "semi-monthly", day1: 15, day2: "last" },
  billSharing: { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] },
  residualAccountId: null,
  postedPaychecks: {},

  // Tracking
  paidBills: {}, // "YYYY-MM-DD:billId": boolean
  confirmedDiscretionary: {},

  // UI State
  mode: "planned", // "planned" | "actual"

  // Hydration guard
  hasHydrated: false,
  lastAutoPostRunISO: null,
};

const normalizeId = (value) => (typeof value === "number" ? String(value) : value);

const normalizeEntity = (entity) => {
  if (!entity || typeof entity !== "object") return entity;
  const normalized = { ...entity };

  if ("id" in normalized && normalized.id != null) {
    normalized.id = normalizeId(normalized.id);
  }

  Object.entries(normalized).forEach(([key, value]) => {
    if (value instanceof Date) {
      normalized[key] = value.toISOString();
    }
  });

  return normalized;
};

const normalizeList = (list) => (Array.isArray(list) ? list.map(normalizeEntity) : []);

const normalizeMode = (mode) => {
  if (!mode || mode === "projected") return "planned";
  return mode === "actual" ? "actual" : "planned";
};

const serializePlannerSettings = (state) => ({
  startDate: state.startDate || INITIAL_STATE.startDate,
  startingBalance: state.startingBalance ?? INITIAL_STATE.startingBalance,
  income: state.income || INITIAL_STATE.income,
  paySchedule: state.paySchedule || INITIAL_STATE.paySchedule,
  billSharing: state.billSharing || INITIAL_STATE.billSharing,
  residualAccountId: state.residualAccountId ?? INITIAL_STATE.residualAccountId,
  mode: normalizeMode(state.mode) || INITIAL_STATE.mode,
});

export const useStore = create(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      setFullPlanData: (data) =>
        set((state) => {
          if (!data) return {};

          const updates = {};

          const transactionsSource = data.transactions ?? data.expenses;
          if (transactionsSource) {
            const transactions = normalizeList(transactionsSource);
            updates.transactions = transactions;
            updates.expenses = transactions;
          }

          const billsSource = data.recurringBills ?? data.bills;
          if (billsSource) {
            const recurringBills = normalizeList(billsSource);
            updates.recurringBills = recurringBills;
            updates.bills = recurringBills;
          }

          if (data.plannerSettings) {
            const settings = data.plannerSettings;
            if (settings.startDate !== undefined) updates.startDate = settings.startDate;
            if (settings.startingBalance !== undefined) updates.startingBalance = settings.startingBalance;
            if (settings.income !== undefined) updates.income = settings.income;
            if (settings.paySchedule !== undefined) updates.paySchedule = settings.paySchedule;
            if (settings.billSharing !== undefined) updates.billSharing = settings.billSharing;
            if (settings.residualAccountId !== undefined) updates.residualAccountId = settings.residualAccountId;
            if (settings.mode !== undefined) updates.mode = normalizeMode(settings.mode);
          }

          const simpleKeys = [
            "startDate",
            "startingBalance",
            "income",
            "paySchedule",
            "billSharing",
            "residualAccountId",
            "postedPaychecks",
            "mode",
            "accounts",
            "goals",
            "categoryBudgets",
            "extraIncomes",
            "allocationRules",
            "paidBills",
            "confirmedDiscretionary",
          ];

          simpleKeys.forEach((key) => {
            if (data[key] !== undefined) {
              const value = data[key];
              if (key === "mode") {
                updates[key] = normalizeMode(value);
              } else {
                updates[key] = Array.isArray(value) ? normalizeList(value) : value;
              }
            }
          });

          if (data.userProfile) {
            updates.userProfile = { ...state.userProfile, ...data.userProfile };
          }

          return updates;
        }),

      updateBills: (newBills) =>
        set(() => {
          const normalized = normalizeList(newBills || []);
          return { bills: normalized, recurringBills: normalized };
        }),

      updateAccounts: (newAccounts, residualId) =>
        set({
          accounts: normalizeList(newAccounts || []),
          residualAccountId: residualId ?? null,
        }),

      updateExpenses: (newExpenses) =>
        set(() => {
          const normalized = normalizeList(newExpenses || []);
          return { expenses: normalized, transactions: normalized };
        }),

      updateGoals: (newGoals) => set({ goals: normalizeList(newGoals || []) }),

      updateBudgets: (newBudgets) => set({ categoryBudgets: newBudgets || {} }),

      updateAllocationRules: (newRules) => set({ allocationRules: normalizeList(newRules || []) }),

      setPaidStatus: (billId, dateStr, isPaid) =>
        set((state) => {
          const key = `${dateStr}:${billId}`;
          const newMap = { ...state.paidBills };
          if (isPaid) newMap[key] = true;
          else delete newMap[key];
          return { paidBills: newMap };
        }),

      setMode: (mode) => set({ mode: normalizeMode(mode) }),

      setConfirmedDiscretionary: (map) =>
        set({ confirmedDiscretionary: map || {} }),

      setHasHydrated: (hydrated = true) => set({ hasHydrated: hydrated }),

      setLastAutoPostRunISO: (iso) => set({ lastAutoPostRunISO: iso || null }),

      // Reset for logout
      reset: () => set({ ...INITIAL_STATE, hasHydrated: true }),
    }),
    {
      name: "cashflow-storage",
      storage: indexedDBStorage,
      partialize: (state) => {
        const transactions = state.transactions?.length ? state.transactions : state.expenses;
        const recurringBills = state.recurringBills?.length ? state.recurringBills : state.bills;
        const mode = normalizeMode(state.mode) || INITIAL_STATE.mode;

        return {
          accounts: normalizeList(state.accounts),
          transactions: normalizeList(transactions),
          recurringBills: normalizeList(recurringBills),
          plannerSettings: serializePlannerSettings({ ...state, mode }),
          paidBills: { ...state.paidBills },
          postedPaychecks: { ...state.postedPaychecks },
          lastAutoPostRunISO: state.lastAutoPostRunISO,
          categoryBudgets: { ...state.categoryBudgets },
          goals: normalizeList(state.goals),
          extraIncomes: normalizeList(state.extraIncomes),
          allocationRules: normalizeList(state.allocationRules),
          mode,
        };
      },
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return { ...currentState, hasHydrated: true };
        }

        const settings = persistedState.plannerSettings || {};
        const mode = normalizeMode(settings.mode ?? persistedState.mode) ?? currentState.mode;

        const accounts = normalizeList(persistedState.accounts ?? currentState.accounts);
        const transactions = normalizeList(
          persistedState.transactions ??
            persistedState.expenses ??
            currentState.transactions ??
            currentState.expenses
        );
        const recurringBills = normalizeList(
          persistedState.recurringBills ??
            persistedState.bills ??
            currentState.recurringBills ??
            currentState.bills
        );

        return {
          ...currentState,
          ...persistedState,
          accounts,
          transactions,
          expenses: transactions,
          recurringBills,
          bills: recurringBills,
          startDate: settings.startDate ?? currentState.startDate,
          startingBalance: settings.startingBalance ?? currentState.startingBalance,
          income: settings.income ?? currentState.income,
          paySchedule: settings.paySchedule ?? currentState.paySchedule,
          billSharing: settings.billSharing ?? currentState.billSharing,
          residualAccountId: settings.residualAccountId ?? currentState.residualAccountId,
          mode: normalizeMode(mode) ?? currentState.mode,
          paidBills: persistedState.paidBills ?? currentState.paidBills,
          postedPaychecks: persistedState.postedPaychecks ?? currentState.postedPaychecks,
          lastAutoPostRunISO: persistedState.lastAutoPostRunISO ?? currentState.lastAutoPostRunISO,
          categoryBudgets: persistedState.categoryBudgets ?? currentState.categoryBudgets,
          goals: normalizeList(persistedState.goals ?? currentState.goals),
          extraIncomes: normalizeList(persistedState.extraIncomes ?? currentState.extraIncomes),
          allocationRules: normalizeList(persistedState.allocationRules ?? currentState.allocationRules),
          hasHydrated: true,
        };
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Failed to rehydrate cashflow store", error);
          }
          state?.setHasHydrated?.(true);
        };
      },
    }
  )
);

export { useStore as useCashflowStore };
