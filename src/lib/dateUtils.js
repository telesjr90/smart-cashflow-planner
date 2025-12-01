// File: src/lib/dateUtils.js

/**
 * Returns today's date as an ISO string: "YYYY-MM-DD".
 * This is safe to use for initializing new planner data, but
 * persisted data should always keep its stored date.
 */
export function getTodayISODate() {
    return new Date().toISOString().slice(0, 10);
  }
  
  /**
   * Default start date for the Planner when no value has been configured yet.
   *
   * We currently default to "today" so that a brand new household starts
   * planning from the current date instead of a hard-coded month in the past.
   *
   * IMPORTANT:
   * - This is only used when the caller does not pass an explicit startDate.
   * - Once a startDate has been saved for a household, that persisted value
   *   should always win over this helper.
   */
  export function getDefaultPlannerStartDate() {
    return getTodayISODate();
  }
  