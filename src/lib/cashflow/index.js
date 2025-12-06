// src/lib/cashflow/index.js
// Re-export all functions for backward compatibility

export { toCents, fromCents, formatCurrency } from './formatters';
export { 
  getTodayISODate, 
  getDefaultPlannerStartDate, 
  clampDayToMonth, 
  getDateForMonthIndex, 
  getMonthIndexFromStart 
} from './dateUtils';
export { projectCashflow } from './projectCashflow';

