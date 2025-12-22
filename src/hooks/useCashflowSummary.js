// src/hooks/useCashflowSummary.js
import { useMemo } from "react";
import { useCashflowStore } from "../store/useCashflowStore";
import {
  projectCashflow,
  getDefaultPlannerStartDate,
} from "../lib/cashflow/index";

export function useCashflowSummary() {
  const startDate = useCashflowStore((state) => state.startDate);
  const accounts = useCashflowStore((state) => state.accounts || []);
  const bills = useCashflowStore((state) => state.bills || []);
  const income = useCashflowStore((state) => state.income || {});
  const paySchedule = useCashflowStore((state) => state.paySchedule || {});
  const allocationRules = useCashflowStore(
    (state) => state.allocationRules || []
  );
  const residualAccountId = useCashflowStore((state) => state.residualAccountId);
  const paidBills = useCashflowStore((state) => state.paidBills || {});
  const extraIncomes = useCashflowStore((state) => state.extraIncomes || []);
  const expenses = useCashflowStore((state) => state.expenses || []);
  const mode = useCashflowStore((state) => state.mode);

  const summary = useMemo(() => {
    try {
      const effectiveStartDate =
        startDate || getDefaultPlannerStartDate({ paySchedule, mode });

      const today = new Date();
      const start = new Date(effectiveStartDate + "T00:00:00");

      const monthIndex =
        (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth());

      const monthsToProject = Math.max(monthIndex + 1, 1);

      const projection = projectCashflow({
        startDate: effectiveStartDate,
        accounts,
        bills,
        income,
        paySchedule,
        allocationRules,
        residualAccountId,
        paidBills,
        extraIncomes,
        expenses,
        mode,
        months: monthsToProject,
      });

      // Engine returns `monthlySummary` (singular)
      const monthlySummary = projection.monthlySummary || [];

      // Derive current summary safely
      const currentSummary =
        (Array.isArray(monthlySummary) && monthlySummary[monthIndex]) ||
        (Array.isArray(monthlySummary) && monthlySummary[0]) ||
        {};

      return {
        totalIncome: currentSummary.totalIncome || 0,
        totalBills: currentSummary.totalBills || 0,
        net: currentSummary.net || 0,
        weeks: currentSummary.weeks || [],
        finalBalances: projection.finalBalancesByAccount || {},
      };
    } catch (e) {
      console.warn("Summary projection failed", e);
      return {
        totalIncome: 0,
        totalBills: 0,
        net: 0,
        weeks: [],
        finalBalances: {},
      };
    }
  }, [
    startDate,
    accounts,
    bills,
    income,
    paySchedule,
    allocationRules,
    residualAccountId,
    paidBills,
    extraIncomes,
    expenses,
    mode,
  ]);

  return summary;
}
