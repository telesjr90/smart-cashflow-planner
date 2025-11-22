// src/lib/billSharing.js

/**
 * Helper to apply bill sharing rules to a list of bills.
 *
 * The Smart Cash Flow Planner supports three modes of splitting shared bills between
 * partners in a household: manual, percentage and equalize.  The mode and
 * associated configuration live on the `billSharing` object stored on the
 * household profile.  This helper transforms the list of bills into a new
 * list reflecting the selected split rules.  Downstream consumers (e.g. the
 * cashflow engine) should use the transformed list for calculations.
 *
 * A bill is considered shared if `bill.isShared` is truthy or if the payer
 * field is set to "AUTO".  Non‑shared bills are returned unchanged.
 *
 * @param {Object} params
 * @param {Array} params.bills         The original list of bill objects.
 * @param {Object} params.income        The income object (per partner per pay period).
 * @param {Object} params.billSharing   Household sharing config.
 * @param {Object} [params.paySchedule] Optional pay schedule to derive monthly income.
 * @returns {Array} A new array of bills reflecting the selected split mode.
 */
export function applyBillSharing({ bills, income, billSharing, paySchedule }) {
    const mode = billSharing?.mode ?? "manual";
    if (!Array.isArray(bills) || bills.length === 0) return bills || [];
  
    if (mode === "manual") {
      // Pass through unchanged.
      return bills;
    }
  
    if (mode === "percentage") {
      return applyPercentageSplit(bills, billSharing?.percentageSplit);
    }
  
    if (mode === "equalize") {
      // We need per‑partner monthly incomes to balance leftover cash.  The
      // optional paySchedule allows callers to supply the plan's pay schedule.
      return applyEqualizeSplit(bills, income, paySchedule);
    }
  
    // Unknown mode – fail safe by returning original bills.
    return bills;
  }
  
  /**
   * Percentage split: for each shared bill, split the amount between partners
   * according to the configured percentages.  Unshared bills (explicitly
   * assigned to a payer) are returned unchanged.  Shared bills produce two
   * synthetic bills suffixed with `_H` and `_W` IDs.
   *
   * @param {Array} bills
   * @param {Object} [percentageSplit] Defaults to equal split.
   * @returns {Array}
   */
  function applyPercentageSplit(bills, percentageSplit = { H: 0.5, W: 0.5 }) {
    const { H = 0.5, W = 0.5 } = percentageSplit || {};
    const result = [];
  
    for (const bill of bills) {
      // Bills with explicit payer assignments are not split.
      if (!bill?.isShared && bill?.payer && bill.payer !== "AUTO" && bill.payer !== "SPLIT") {
        result.push(bill);
        continue;
      }
  
      // Determine the base amount for splitting.  Fallback to 0 if invalid.
      const baseAmt = Number.isFinite(+bill?.amount) ? +bill.amount : 0;
      const amountH = Math.round(baseAmt * H);
      const amountW = baseAmt - amountH;
      // Create two child bills.  We retain all other properties from the
      // original except for `id`, `payer` and `amount`.
      result.push(
        {
          ...bill,
          id: `${bill.id || ""}_H`,
          amount: amountH,
          payer: "H",
        },
        {
          ...bill,
          id: `${bill.id || ""}_W`,
          amount: amountW,
          payer: "W",
        }
      );
    }
  
    return result;
  }
  
  /**
   * Equalize split: greedily assign each shared bill to the partner whose
   * leftover cash would be most improved by covering that bill.  This aims to
   * equalize the leftover cash between partners after paying their assigned
   * bills.
   *
   * @param {Array} bills  The list of bill objects.
   * @param {Object} income Per‑partner income (per pay period or monthly).
   * @param {Object} paySchedule Optional pay schedule to derive monthly income.
   * @returns {Array}
   */
  function applyEqualizeSplit(bills, income = {}, paySchedule) {
    const shared = [];
    const fixed = [];
  
    for (const bill of bills) {
      if (!bill) continue;
      const isShared = bill.isShared || bill.payer === "AUTO" || bill.payer === "SPLIT";
      if (isShared) shared.push(bill);
      else fixed.push(bill);
    }
  
    // Compute starting sums for fixed assignments
    let totalH = fixed
      .filter((b) => b.payer === "H")
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    let totalW = fixed
      .filter((b) => b.payer === "W")
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  
    // Derive monthly income per partner
    const { monthlyIncomeH, monthlyIncomeW } = deriveMonthlyIncomePerPartner(income, paySchedule);
  
    // Sort shared bills largest to smallest
    shared.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  
    const assigned = [];
    for (const bill of shared) {
      const amt = Number(bill.amount) || 0;
      // Compute leftover amounts if this bill is assigned to H or W
      const leftoverH_ifH = monthlyIncomeH - (totalH + amt);
      const leftoverW_ifH = monthlyIncomeW - totalW;
      const diffIfH = Math.abs(leftoverH_ifH - leftoverW_ifH);
  
      const leftoverH_ifW = monthlyIncomeH - totalH;
      const leftoverW_ifW = monthlyIncomeW - (totalW + amt);
      const diffIfW = Math.abs(leftoverH_ifW - leftoverW_ifW);
  
      if (diffIfH <= diffIfW) {
        totalH += amt;
        assigned.push({ ...bill, payer: "H" });
      } else {
        totalW += amt;
        assigned.push({ ...bill, payer: "W" });
      }
    }
  
    return [...fixed, ...assigned];
  }
  
  /**
   * Derive monthly income per partner.  The income object on a household
   * represents the pay per pay period.  To convert to monthly values we
   * estimate the number of pay events per month based on the paySchedule.  If
   * no schedule is provided, semi‑monthly (two pays per month) is assumed.  The
   * function also tolerates different property names (e.g. "husband", "H") and
   * returns zeros when missing.
   *
   * @param {Object} income  Income values keyed by partner (per pay period).
   * @param {Object} paySchedule Optional schedule with `type` property.
   * @returns {{ monthlyIncomeH: number, monthlyIncomeW: number }}
   */
  export function deriveMonthlyIncomePerPartner(income = {}, paySchedule = {}) {
    // Determine pay frequency.  Semi‑monthly => 2 paydays per month, otherwise 1.
    const type = paySchedule?.type || "semi-monthly";
    const payCount = type === "semi-monthly" ? 2 : 1;
    // Support both "husband"/"wife" and "H"/"W" keys.
    const hVal = income.husband ?? income.H ?? income.h ?? 0;
    const wVal = income.wife ?? income.W ?? income.w ?? 0;
    const monthlyIncomeH = Number.isFinite(+hVal) ? +hVal * payCount : 0;
    const monthlyIncomeW = Number.isFinite(+wVal) ? +wVal * payCount : 0;
    return { monthlyIncomeH, monthlyIncomeW };
  }