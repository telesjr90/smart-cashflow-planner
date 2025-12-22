import { describe, it, expect } from "vitest";
import {
  getRoleSharePercent,
  isBillVisibleInSelfScope,
  getScopedBillAmount,
} from "../../src/lib/billSharing.js";

describe("billSharing helpers", () => {
  describe("getRoleSharePercent", () => {
    it("returns 0.5 defaults for both roles when billSharing is missing", () => {
      expect(getRoleSharePercent({ role: "H", billSharing: undefined })).toBe(0.5);
      expect(getRoleSharePercent({ role: "W", billSharing: undefined })).toBe(0.5);
    });

    it("clamps out-of-range percentages to [0,1]", () => {
      const billSharing = { percentageSplit: { H: 1.2, W: -0.2 } };
      expect(getRoleSharePercent({ role: "H", billSharing })).toBe(1);
      expect(getRoleSharePercent({ role: "W", billSharing })).toBe(0);
    });
  });

  describe("isBillVisibleInSelfScope", () => {
    it("shows bills for self or shared/auto/unspecified payers and hides partner-only bills", () => {
      const bill = { amount: 100 };
      expect(isBillVisibleInSelfScope({ bill: { ...bill, payer: "H" }, role: "H" })).toBe(
        true
      );
      expect(isBillVisibleInSelfScope({ bill: { ...bill, payer: "W" }, role: "H" })).toBe(
        false
      );
      expect(
        isBillVisibleInSelfScope({ bill: { ...bill, payer: "Shared" }, role: "H" })
      ).toBe(true);
      expect(
        isBillVisibleInSelfScope({ bill: { ...bill, payer: "AUTO" }, role: "H" })
      ).toBe(true);
      expect(isBillVisibleInSelfScope({ bill: { ...bill, payer: undefined }, role: "H" })).toBe(
        true
      );
    });
  });

  describe("getScopedBillAmount", () => {
    const amount = 2591.83; // use cents-level decimals to verify no rounding surprises

    it("returns full amount when payer matches role", () => {
      const bill = { amount, payer: "H" };
      expect(getScopedBillAmount({ bill, role: "H", billSharing: {} })).toBeCloseTo(
        amount,
        10
      );
    });

    it("splits shared/auto/unspecified bills by role share percent", () => {
      const billSharing = { percentageSplit: { H: 0.6, W: 0.4 } };
      const bill = { amount, payer: "Shared" };
      expect(getScopedBillAmount({ bill, role: "H", billSharing })).toBeCloseTo(
        amount * 0.6,
        10
      );

      const autoBill = { amount, payer: "AUTO" };
      expect(getScopedBillAmount({ bill: autoBill, role: "H", billSharing })).toBeCloseTo(
        amount * 0.6,
        10
      );

      const unspecified = { amount };
      expect(
        getScopedBillAmount({ bill: unspecified, role: "W", billSharing: { percentageSplit: { H: 0.7, W: 0.3 } } })
      ).toBeCloseTo(amount * 0.3, 10);
    });

    it("returns zero for partner-only bills", () => {
      const bill = { amount, payer: "W" };
      expect(getScopedBillAmount({ bill, role: "H", billSharing: {} })).toBe(0);
    });
  });
});
