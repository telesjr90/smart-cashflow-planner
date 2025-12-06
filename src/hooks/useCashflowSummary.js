import { useMemo } from 'react';
import { useCashflowStore } from '../store/useCashflowStore';
import { projectCashflow, fromCents } from '../lib/cashflow/index.js';

export function useCashflowSummary() {
  // 1. FIX: Retrieve the whole state to avoid infinite loops caused by 
  // object-literal selectors creating new references on every render.
  const state = useCashflowStore();

  // 2. Memoize the plan configuration to prevent unnecessary projection runs
  const planData = useMemo(() => ({
    startDate: state.startDate,
    accounts: state.accounts,
    bills: state.bills,
    income: state.income,
    paySchedule: state.paySchedule,
    allocationRules: state.allocationRules,
    residualAccountId: state.residualAccountId,
    paidBills: state.paidBills,
    extraIncomes: state.extraIncomes,
    expenses: state.expenses,
    mode: state.mode
  }), [
    state.startDate,
    state.accounts,
    state.bills,
    state.income,
    state.paySchedule,
    state.allocationRules,
    state.residualAccountId,
    state.paidBills,
    state.extraIncomes,
    state.expenses,
    state.mode
  ]);

  const summary = useMemo(() => {
    try {
      // Run the engine for 1 month to get the current snapshot
      const result = projectCashflow({
        ...planData,
        months: 1, 
      });
      
      const currentMonth = result.monthlySummary[0] || {};
      
      return {
        totalIncome: fromCents(currentMonth.totalIncome || 0),
        totalOutflow: fromCents(currentMonth.totalBills || 0), 
        net: fromCents(currentMonth.net || 0),
        
        // Pass full objects for 'actual' vs 'projected' displays
        projected: planData.mode === 'projected' ? currentMonth : null,
        actual: planData.mode === 'actual' ? currentMonth : null
      };
    } catch (e) {
      console.error("Summary calculation failed", e);
      return { totalIncome: "0.00", totalOutflow: "0.00", net: "0.00" };
    }
  }, [planData]);

  return summary;
}