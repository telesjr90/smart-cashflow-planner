// src/lib/cashflow/calculateGoals.js
import { toCents, fromCents } from "./formatters";

/**
 * Calculates the projected completion date and months remaining for a goal.
 * @param {Object} goal - { targetAmount, currentAmount, monthlyContribution }
 * @returns {Object} - { monthsRemaining, completionDate, isAchieved }
 */
export function calculateGoalProjection(goal) {
  const target = toCents(goal.targetAmount || 0);
  const current = toCents(goal.savedAmount || goal.currentAmount || 0); // Handle both naming conventions
  const monthly = toCents(goal.monthlyContribution || 0);

  if (current >= target) {
    return {
      monthsRemaining: 0,
      completionDate: new Date().toISOString().slice(0, 10),
      isAchieved: true,
      percentComplete: 100
    };
  }

  if (monthly <= 0) {
    return {
      monthsRemaining: Infinity,
      completionDate: null,
      isAchieved: false,
      percentComplete: target > 0 ? Math.round((current / target) * 100) : 0
    };
  }

  const remaining = target - current;
  const monthsRemaining = Math.ceil(remaining / monthly);
  
  const today = new Date();
  const completionDate = new Date(today.getFullYear(), today.getMonth() + monthsRemaining, 1);
  
  return {
    monthsRemaining,
    completionDate: completionDate.toISOString().slice(0, 10),
    isAchieved: false,
    percentComplete: Math.round((current / target) * 100)
  };
}