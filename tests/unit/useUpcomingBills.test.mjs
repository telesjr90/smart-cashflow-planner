import { describe, it, expect } from "vitest";
import { computeUpcomingBillAmounts } from "../../src/hooks/useUpcomingBills.js";

describe("computeUpcomingBillAmounts", () => {
  it("returns both dollars and cents for a simple bill (guards against 100x underflow)", () => {
    const bill = { id: "b1", amount: 17.95, payer: "H" };
    const { scopedAmountCents, scopedAmountDollars } = computeUpcomingBillAmounts({
      bill,
      role: "H",
      billSharing: {},
    });

    expect(Number.isInteger(scopedAmountCents)).toBe(true);
    expect(scopedAmountCents).toBe(1795);
    expect(scopedAmountDollars).toBeCloseTo(17.95, 2);
    // Contract: getScopedBillAmount returns dollars (not cents); if this starts coming back as 1795, this test should fail.
    expect(scopedAmountDollars).toBeLessThan(100);
    expect(scopedAmountCents / 100).toBeCloseTo(scopedAmountDollars, 2);
    // Regression: do not return cents-as-dollars
    expect(scopedAmountDollars).not.toBeCloseTo(0.1795, 4);
    expect(scopedAmountCents).not.toBe(18);
  });

  it("respects shared bill percentage splits with stable rounding", () => {
    const bill = { id: "b2", amount: 17.95, payer: "Shared" };
    const billSharing = { percentageSplit: { H: 0.3, W: 0.7 } };

    const { scopedAmountCents, scopedAmountDollars } = computeUpcomingBillAmounts({
      bill,
      role: "H",
      billSharing,
    });

    const expectedDollars = Number((17.95 * 0.3).toFixed(2));
    const expectedCents = Math.round(expectedDollars * 100);

    expect(Number.isInteger(scopedAmountCents)).toBe(true);
    expect(scopedAmountDollars).toBeCloseTo(expectedDollars, 2);
    expect(scopedAmountCents).toBe(expectedCents);
    expect(scopedAmountCents / 100).toBeCloseTo(scopedAmountDollars, 2);
  });
});
