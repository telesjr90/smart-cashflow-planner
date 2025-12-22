// src/hooks/useUpcomingBills.js
import { useMemo } from "react";
import { useCashflowStore } from "../store/useCashflowStore";
import { getNextDueDate } from "../lib/cashflow/recurring";
import {
  getScopedBillAmount,
  isBillVisibleInSelfScope,
} from "../lib/billSharing";

/**
 * Normalize a bill's scoped amount to both cents and dollars.
 * We expose cents so callers that divide by 100 (treating values as cents)
 * display the correct dollar amount instead of a 100x underflow.
 */
export function computeUpcomingBillAmounts({ bill, role, billSharing }) {
  const scopedAmountDollars = (() => {
    const amt = getScopedBillAmount({ bill, role, billSharing });
    const n = Number.isFinite(amt) ? Number(amt) : 0;
    return Number(n.toFixed(2));
  })();

  const scopedAmountCents = Math.round(scopedAmountDollars * 100);

  return { scopedAmountDollars, scopedAmountCents };
}

export function useUpcomingBills(daysLookahead = 30) {
  const bills = useCashflowStore((state) => state.bills);
  const paidBills = useCashflowStore((state) => state.paidBills);
  const userProfile = useCashflowStore((state) => state.userProfile);
  const billSharing = useCashflowStore((state) => state.billSharing);
  const role = userProfile?.role || "H";

  const upcoming = useMemo(() => {
    if (!bills || !bills.length) return [];

    const today = new Date();
    // Reset time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + daysLookahead);

    return bills
      .filter((bill) => isBillVisibleInSelfScope({ bill, role }))
      .map((bill) => {
        // Calculate the very next due date relative to today
        const nextDate = getNextDueDate(bill.dueDay, today);
        const dateStr = nextDate.toISOString().slice(0, 10);
        
        // Check if this specific instance is paid
        const key = `${dateStr}:${bill.id}`;
        const isPaid = !!paidBills[key];
        const { scopedAmountDollars, scopedAmountCents } =
          computeUpcomingBillAmounts({ bill, role, billSharing });

        return {
          ...bill,
          nextDueDate: nextDate,
          dateStr,
          isPaid,
          scopedAmountCents,
          scopedAmountDollars,
          status: isPaid ? "paid" : nextDate < today ? "overdue" : "pending",
          scopeLabel: "Self",
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
  }, [bills, paidBills, daysLookahead, role, billSharing]);

  return upcoming;
}
