import { projectCashflow, getDefaultPlannerStartDate } from "../../lib/cashflow/index";

/**
 * Runs the cashflow engine to generate a summary for the *current* month.
 * This effectively replaces the logic inside Home.jsx / useCashflowSummary.
 */
export const selectFinancialSummary = (state) => {
  const startDate = state.startDate || getDefaultPlannerStartDate();
  
  // 1. Determine current month index
  const today = new Date();
  const start = new Date(startDate + "T00:00:00");
  const monthIndex = (today.getFullYear() - start.getFullYear()) * 12 + 
                     (today.getMonth() - start.getMonth());
                     
  // 2. Project enough months to reach 'now'
  const monthsToProject = Math.max(1, monthIndex + 1);

  try {
    const projection = projectCashflow({
      startDate,
      months: monthsToProject,
      accounts: state.accounts || [],
      bills: state.bills || [],
      income: state.income || { husband: 0, wife: 0 },
      paySchedule: state.paySchedule || { type: "semi-monthly", day1: 15, day2: "last" },
      allocationRules: state.allocationRules || [],
      residualAccountId: state.residualAccountId,
      paidBills: state.paidBills || {},
      extraIncomes: state.extraIncomes || [],
      expenses: state.expenses || [],
      mode: state.mode || "projected"
    });

    const summary = (projection.monthlySummary || [])[monthIndex] || {};

    return {
      totalIncome: summary.totalIncome || 0,
      totalBills: summary.totalBills || 0,
      net: summary.net || 0,
      weeks: summary.weeks || [],
      finalBalances: projection.finalBalancesByAccount || {}
    };
  } catch (e) {
    console.warn("Summary selector projection failed", e);
    return {
      totalIncome: 0,
      totalBills: 0,
      net: 0,
      weeks: [],
      finalBalances: {}
    };
  }
};