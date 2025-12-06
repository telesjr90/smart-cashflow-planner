// src/lib/cashflow/dateUtils.js

/**
 * Returns today's date as an ISO string: "YYYY-MM-DD".
 */
export function getTodayISODate() {
  // Use local time to avoid timezone offset issues (e.g. UTC showing yesterday)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultPlannerStartDate() {
  return getTodayISODate();
}

/**
 * Clamps a day (e.g. 31) to the valid range for a given month/year.
 */
export function clampDayToMonth(year, monthIndex0, day) {
  const last = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

/**
 * Calculates a target date based on a start date and month offset.
 * @param {string} startDateStr - "YYYY-MM-DD"
 * @param {number} monthOffset - 0 for current month, 1 for next, etc.
 * @param {number} day - Target day of month
 */
export function getDateForMonthIndex(startDateStr, monthOffset, day) {
  const [y, m] = (startDateStr || getTodayISODate())
    .split("-")
    .map((x) => parseInt(x, 10));
  
  // Base is the 1st of the start month
  const base = new Date(y, m - 1, 1);
  // Add offset
  const target = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const safeDay = clampDayToMonth(target.getFullYear(), target.getMonth(), day);
  const d = new Date(target.getFullYear(), target.getMonth(), safeDay);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dd}`;
}

export function getMonthIndexFromStart(startDateStr, targetDateStr) {
  const [sy, sm] = (startDateStr || getTodayISODate()).split("-").map(Number);
  const [ty, tm] = (targetDateStr || getTodayISODate()).split("-").map(Number);
  return (ty - sy) * 12 + (tm - sm);
}

