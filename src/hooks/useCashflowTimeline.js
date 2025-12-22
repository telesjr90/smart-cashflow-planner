import { useMemo } from "react";
import { useCashflowStore } from "../store/useCashflowStore";
import {
  projectCashflow,
  normalizeCashflowMode,
  DEFAULT_CASHFLOW_MODE,
} from "../lib/cashflow/index.js";
import { formatDateShort } from "../utils/dateFormat";

function isValidISODateString(value) {
  if (!value || typeof value !== "string") return false;
  // Basic ISO date check: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthIndexFromStart(startISO, todayISO) {
  const [sy, sm] = (startISO || "").split("-").map(Number);
  const [ty, tm] = (todayISO || "").split("-").map(Number);
  if (
    !Number.isFinite(sy) ||
    !Number.isFinite(sm) ||
    !Number.isFinite(ty) ||
    !Number.isFinite(tm)
  ) {
    return 0;
  }
  return (ty - sy) * 12 + (tm - sm);
}

export function useCashflowTimeline(months) {
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

  const normalizedMode =
    normalizeCashflowMode(mode) || DEFAULT_CASHFLOW_MODE;

  return useMemo(() => {
    try {
      const todayISO = getTodayISO();
      const startValid = isValidISODateString(startDate);
      const effectiveStartDate = startValid ? startDate : todayISO;
      const effectiveMonths =
        months && Number.isFinite(months)
          ? months
          : Math.max(6, monthIndexFromStart(effectiveStartDate, todayISO) + 1);

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
        mode: normalizedMode,
        months: effectiveMonths,
      });

      const ledger = projection.ledger || [];
      const dailyMap = new Map();

      ledger.forEach((entry) => {
        const totalBal = Object.values(entry.balances || {}).reduce(
          (a, b) => a + b,
          0
        );
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
