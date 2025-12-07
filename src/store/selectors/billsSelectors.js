import { getDefaultPlannerStartDate } from "../../lib/cashflow/index";

// Basic Selectors
export const selectBills = (state) => state.bills || [];
export const selectPaidBillsMap = (state) => state.paidBills || {};

/**
 * Derives the list of bills for a specific month index relative to the start date.
 * Enriches bills with:
 * - calculated due date (clamped to month end)
 * - paid status
 * - overdue status
 * * @param {Object} state - The Zustand store state
 * @param {number} monthIndex - 0 for start month, 1 for next, etc.
 */
export const getBillsForMonth = (state, monthIndex = 0) => {
  const bills = state.bills || [];
  const paidBills = state.paidBills || {};
  const startDate = state.startDate || getDefaultPlannerStartDate();

  if (!startDate) return [];

  // Calculate target month context
  const start = new Date(startDate + "T00:00:00");
  const baseYear = start.getFullYear();
  const baseMonth = start.getMonth();
  
  const targetDate = new Date(baseYear, baseMonth + monthIndex, 1);
  const year = targetDate.getFullYear();
  const monthIndex0 = targetDate.getMonth();
  
  // For overdue check
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  return bills.map((b) => {
    // Clamp due day to valid days in month (e.g. Feb 30 -> Feb 28)
    const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
    const safeDueDay = Math.min(Math.max(1, b.dueDay || 1), lastDay);
    
    // Construct Key: YYYY-MM-DD:billId
    const dueDate = new Date(year, monthIndex0, safeDueDay);
    // Use local time YYYY-MM-DD
    const dateStr = dueDate.toLocaleDateString("en-CA"); 
    const paidKey = `${dateStr}:${b.id}`;
    
    const isPaid = !!paidBills[paidKey];

    const isOverdue =
      !isPaid &&
      year === todayYear &&
      monthIndex0 === todayMonth &&
      safeDueDay < todayDay;

    return {
      ...b,
      dueDay: safeDueDay,
      dueDate: dateStr,
      monthIndex,
      paid: isPaid,
      overdue: isOverdue,
    };
  }).sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name || ""));
};

/**
 * Selects bills for the *current* month based on today's date.
 */
export const selectCurrentMonthBills = (state) => {
  const startDate = state.startDate || getDefaultPlannerStartDate();
  const today = new Date();
  const start = new Date(startDate + "T00:00:00");
  
  // Calculate month index of today relative to start
  const currentMonthIdx = (today.getFullYear() - start.getFullYear()) * 12 + 
                          (today.getMonth() - start.getMonth());

  return getBillsForMonth(state, Math.max(0, currentMonthIdx));
};

/**
 * Selects only the overdue bills for the current month.
 */
export const selectOverdueBills = (state) => {
  const currentBills = selectCurrentMonthBills(state);
  return currentBills.filter(b => b.overdue);
};

/**
 * Selects upcoming (unpaid) bills for the current month, limited by count.
 */
export const selectUpcomingBills = (state, limit = 5) => {
  const currentBills = selectCurrentMonthBills(state);
  // Filter for unpaid and not overdue (or include overdue if preferred, usually upcoming implies future)
  // Here we just grab anything not paid.
  const pending = currentBills.filter(b => !b.paid);
  return pending.slice(0, limit);
};