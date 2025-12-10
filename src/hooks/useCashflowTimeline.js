import { useMemo } from "react";
import { useCashflowStore } from "../store/useCashflowStore";
import { projectCashflow } from "../lib/cashflow/index.js";
import { formatDateShort } from "../utils/dateFormat";

export function useCashflowTimeline(months = 6) {
  const startDate = useCashflowStore((state) => state.startDate);
  const accounts = useCashflowStore((state) => state.accounts || []);
  const bills = useCashflowStore((state) => state.bills || []);
  const income = useCashflowStore((state) => state.income || {});
  const paySchedule = useCashflowStore((state) => state.paySchedule || {});
  const allocationRules = useCashflowStore((state) => state.allocationRules || []);
  const residualAccountId = useCashflowStore((state) => state.residualAccountId);
  const paidBills = useCashflowStore((state) => state.paidBills || {});
  const extraIncomes = useCashflowStore((state) => state.extraIncomes || []);
  const expenses = useCashflowStore((state) => state.expenses || []);
  const mode = useCashflowStore((state) => state.mode);

  return useMemo(() => {
    try {
      const projection = projectCashflow({
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
        months,
      });

      const ledger = projection.ledger || [];
      const dailyMap = new Map();

      ledger.forEach((entry) => {
        const totalBal = Object.values(entry.balances || {}).reduce((a, b) => a + b, 0);
        dailyMap.set(entry.date, totalBal);
      });

      const sortedDates = Array.from(dailyMap.keys()).sort();

      return sortedDates.map((date) => ({
        date,
        balance: (dailyMap.get(date) || 0) / 100,
        label: formatDateShort(date),
      }));
    } catch (e) {
      console.error("Timeline calculation failed", e);
      return [];
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
    months,
  ]);
}
