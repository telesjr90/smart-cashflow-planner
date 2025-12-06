// src/hooks/useUpcomingBills.js
import { useMemo } from 'react';
import { useCashflowStore } from '../store/useCashflowStore';
import { getNextDueDate } from '../lib/cashflow/recurring';
import { getTodayISODate } from '../lib/cashflow/dateUtils';

export function useUpcomingBills(daysLookahead = 30) {
  const bills = useCashflowStore((state) => state.bills);
  const paidBills = useCashflowStore((state) => state.paidBills);

  const upcoming = useMemo(() => {
    if (!bills || !bills.length) return [];

    const today = new Date();
    // Reset time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + daysLookahead);

    return bills
      .map((bill) => {
        // Calculate the very next due date relative to today
        const nextDate = getNextDueDate(bill.dueDay, today);
        const dateStr = nextDate.toISOString().slice(0, 10);
        
        // Check if this specific instance is paid
        const key = `${dateStr}:${bill.id}`;
        const isPaid = !!paidBills[key];

        return {
          ...bill,
          nextDueDate: nextDate,
          dateStr,
          isPaid,
          status: isPaid ? 'paid' : (nextDate < today ? 'overdue' : 'pending')
        };
      })
      .filter((item) => {
        // Filter out items that are too far in the future
        // We generally keep overdue items visible until paid
        if (item.nextDueDate > limitDate) return false;
        
        // Option: Filter out paid items if you only want "To Do"
        // if (item.isPaid) return false; 
        
        return true;
      })
      .sort((a, b) => a.nextDueDate - b.nextDueDate);
  }, [bills, paidBills, daysLookahead]);

  return upcoming;
}