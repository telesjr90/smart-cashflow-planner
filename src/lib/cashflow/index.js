// src/lib/cashflow/index.js
export { toCents, fromCents, formatCurrency } from "./formatters";
export {
  getTodayISODate,
  getDefaultPlannerStartDate,
  clampDayToMonth,
  getDateForMonthIndex,
  getMonthIndexFromStart,
} from "./dateUtils";
export { projectCashflow } from "./projectCashflow";
export { enumeratePaydays, getNextDueDate } from "./recurring";
export { calculateGoalProjection } from "./calculateGoals";

export const DEFAULT_CASHFLOW_MODE = "planned";

export function normalizeCashflowMode(mode) {
  if (!mode || mode === "projected") return "planned";
  if (mode === "actual") return "actual";
  return "planned";
}

export function projectCashflowWithMode(params) {
  const normalizedMode = normalizeCashflowMode(params?.mode);
  const safeParams = params || {};
  return projectCashflow({ ...safeParams, mode: normalizedMode });
}
