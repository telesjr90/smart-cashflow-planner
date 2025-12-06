// src/store/useCashflowStore.js

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Initial state constant
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
  startDate: "2025-01-01",
  startingBalance: 0,
  
  // Entities
  accounts: [],
  bills: [],
  expenses: [],
  goals: [],
  categoryBudgets: {},
  extraIncomes: [],
  allocationRules: [],
  
  // Configuration
  income: { husband: 0, wife: 0 },
  paySchedule: { type: "semi-monthly", day1: 15, day2: "last" },
  billSharing: { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] },
  residualAccountId: null,
  
  // Tracking
  paidBills: {}, // "YYYY-MM-DD:billId": boolean
  confirmedDiscretionary: {},
  
  // UI State
  mode: "projected", // "projected" | "actual"
};

export const useCashflowStore = create(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // --- Actions ---
      setUserProfile: (profile) => set((state) => ({
        userProfile: { ...state.userProfile, ...profile }
      })),

      setFullPlanData: (data) => set((state) => ({
        ...state,
        ...data // merge loaded data into store
      })),

      updateBills: (newBills) => set({ bills: newBills }),
      
      updateAccounts: (newAccounts, residualId) => set({ 
        accounts: newAccounts,
        residualAccountId: residualId 
      }),

      updateExpenses: (newExpenses) => set({ expenses: newExpenses }),
      
      updateGoals: (newGoals) => set({ goals: newGoals }),
      
      updateBudgets: (newBudgets) => set({ categoryBudgets: newBudgets }),

      setPaidStatus: (billId, dateStr, isPaid) => set((state) => {
        const key = `${dateStr}:${billId}`;
        const newMap = { ...state.paidBills };
        if (isPaid) newMap[key] = true;
        else delete newMap[key];
        return { paidBills: newMap };
      }),

      setMode: (mode) => set({ mode }),

      // Reset for logout
      reset: () => set(INITIAL_STATE),
    }),

    {
      name: 'cashflow-storage', // name of the item in localStorage
      partialize: (state) => ({
        // Only persist non-sensitive / non-derived data if needed here.
        // For now, we persist everything to ensure offline capability matches current app.
        mode: state.mode,
        // We might choose NOT to persist everything here if we rely on Firebase sync,
        // but for "Foundation", let's keep it safe.
      }),
    }
  )
);

