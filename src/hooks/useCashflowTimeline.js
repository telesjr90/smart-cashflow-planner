import { useMemo } from 'react';
import { useCashflowStore } from '../store/useCashflowStore';
import { projectCashflow } from '../lib/cashflow/index.js';

export function useCashflowTimeline(months = 6) {
  // 1. Select all plan data
  const planData = useCashflowStore((state) => ({
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
  }));

  // 2. Run Projection & Format for Chart
  const timelineData = useMemo(() => {
    try {
      const { ledger } = projectCashflow({
        ...planData,
        months: months,
      });

      // The ledger contains every single transaction. 
      // We want to sample the "closing balance" for each day.
      
      const dailyMap = new Map();

      // Initialize with start date
      let currentBalance = 0; // simplified global balance for chart
      // (In a real app, you might want specific account balances, but we'll sum them for now)
      
      ledger.forEach(entry => {
        // Calculate total balance across all accounts for this entry
        const totalBal = Object.values(entry.balances).reduce((a, b) => a + b, 0);
        dailyMap.set(entry.date, totalBal);
      });

      // Convert Map to sorted array
      const sortedDates = Array.from(dailyMap.keys()).sort();
      
      return sortedDates.map(date => ({
        date,
        balance: (dailyMap.get(date) || 0) / 100, // Convert cents to dollars
        label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }));

    } catch (e) {
      console.error("Timeline calculation failed", e);
      return [];
    }
  }, [planData, months]);

  return timelineData;
}