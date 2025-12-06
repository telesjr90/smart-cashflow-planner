// src/lib/cashflow/recurring.js
import { clampDayToMonth } from "./dateUtils";

/**
 * Generates a list of paydays for a semi-monthly or other schedule.
 * Moved/Refactored from internal helper in projectCashflow.js
 */
export function enumeratePaydays(startDateStr, months, paySchedule) {
  const start = new Date(`${startDateStr || "2025-01-01"}T00:00:00`);
  const out = [];
  const type = paySchedule?.type || "semi-monthly";
  const rawDay1 = paySchedule?.day1;
  const rawDay2 = paySchedule?.day2;

  for (let i = 0; i < Math.max(1, months || 1); i++) {
    const monthDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = monthDate.getFullYear();
    const monthIndex0 = monthDate.getMonth();
    const monthEndDay = new Date(year, monthIndex0 + 1, 0).getDate();
    const dates = [];

    if (type === "semi-monthly") {
      const day1 = clampDayToMonth(
        year,
        monthIndex0,
        Number.isFinite(+rawDay1) ? +rawDay1 : 15
      );
      dates.push(new Date(year, monthIndex0, day1));

      if (rawDay2 === "last" || rawDay2 === undefined || rawDay2 === null) {
        dates.push(new Date(year, monthIndex0, monthEndDay));
      } else {
        const d2 = clampDayToMonth(
          year,
          monthIndex0,
          Number.isFinite(+rawDay2) ? +rawDay2 : monthEndDay
        );
        if (d2 !== day1) {
          dates.push(new Date(year, monthIndex0, d2));
        }
      }
    } else {
      // Fallback: Monthly on the 15th
      dates.push(new Date(year, monthIndex0, clampDayToMonth(year, monthIndex0, 15)));
    }

    dates
      .sort((a, b) => a.getTime() - b.getTime())
      .forEach((d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        out.push({ date: `${yyyy}-${mm}-${dd}`, monthIndex: i });
      });
  }
  return out;
}

/**
 * Calculates the next due date for a monthly bill relative to a reference date (usually today).
 */
export function getNextDueDate(dueDay, referenceDate = new Date()) {
  const day = Number(dueDay) || 1;
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  // Check if it's yet to pass this month
  const thisMonthDate = new Date(currentYear, currentMonth, day);
  const maxDayThisMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  thisMonthDate.setDate(Math.min(day, maxDayThisMonth));

  if (thisMonthDate >= referenceDate) {
    return thisMonthDate;
  }

  // Otherwise, it's next month
  const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
  const maxDayNextMonth = new Date(currentYear, currentMonth + 2, 0).getDate();
  nextMonthDate.setDate(Math.min(day, maxDayNextMonth));
  
  return nextMonthDate;
}