import { useCashflowStore } from "../store/useCashflowStore";
import { selectFinancialSummary } from "../store/selectors/summarySelectors";
import { shallow } from "zustand/shallow";

/**
 * Optimized hook to fetch the current month's financial summary.
 * Uses shallow comparison to prevent re-renders unless the derived summary actually changes.
 */
export function useCashflowSummary() {
  return useCashflowStore(selectFinancialSummary, shallow);
}