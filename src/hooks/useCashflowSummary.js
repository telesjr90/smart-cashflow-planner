// src/hooks/useCashflowSummary.js
import { useMemo } from "react";
import { useCashflowStore } from "../store/useCashflowStore";
import {
  projectCashflow,
  getDefaultPlannerStartDate,
} from "../lib/cashflow/index";

export function useCashflowSummary() {
  // ✅ Each selector returns a direct slice from the store, not a new object literal
  const startDate = useCashflowStore((state) => state.startDate);
  const accounts = useCashflowStore((state) => state.accounts || []);
  const bills = useCashflowStore((state) => state.bills || []);
  const income = useCashflowStore((state) => state.income || {});
  const paySchedule = useCashflowStore((state) => state.paySchedule || {});
  const allocationRules = useCashflowStore(
    (state) => state.allocationRules || []
  );
  const residualAccountId = useCashflowStore(
    (state) => state.residualAccountId
  );
  const paidBills = useCashflowStore((state) => state.paidBills || {});
  const extraIncomes = useCashflowStore((state) => state.extraIncomes || []);
  const expenses = useCashflowStore((state) => state.expenses || []);
  const mode = useCashflowStore((state) => state.mode);

  // ✅ All derived work happens in a memo that depends on stable slices
  const summary = useMemo(() => {
    const effectiveStartDate =
      startDate || getDefaultPlannerStartDate({ paySchedule, mode });

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
    });

    // Whatever your previous return shape was:
    // e.g. return { projected, actual, upcoming, ... }
    return {
      // ...your calculated summary fields from `projection`...
      // projectedCashLeft: projection.projectedCashLeft,
      // actualCashLeft: projection.actualCashLeft,
      // ...
    };
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
