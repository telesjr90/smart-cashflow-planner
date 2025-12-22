import { describe, it, expect } from "vitest";
import {
  getRoleSharePercent,
  isBillVisibleInSelfScope,
  getScopedBillAmount,
} from "../../src/lib/billSharing.js";

describe("billSharing helpers", () => {
  describe("getRoleSharePercent", () => {
    it("defaults to 0.5 for both roles when config is missing", () => {
      expect(getRoleSharePercent({ role: "H", billSharing: undefined })).toBe(0.5);
      expect(getRoleSharePercent({ role: "W", billSharing: undefined })).toBe(0.5);
    });

    it("clamps percentages to [0,1]", () => {
      const billSharing = { percentageSplit: { H: 2, W: -1 } };
      expect(getRoleSharePercent({ role: "H", billSharing })).toBe(1);
      expect(getRoleSharePercent({ role: "W", billSharing })).toBe(0);
    });
  });

  describe("isBillVisibleInSelfScope", () => {
    const baseBill = { amount: 100 };
    it("shows bills for the current role", () => {
      expect(isBillVisibleInSelfScope({ bill: { ...baseBill, payer: "H" }, role: "H" })).toBe(
        true
      );
    });

    it("hides partner-only bills", () => {
      expect(isBillVisibleInSelfScope({ bill: { ...baseBill, payer: "W" }, role: "H" })).toBe(
        false
      );
    });

    it("shows shared/auto/unspecified bills", () => {
      expect(
        isBillVisibleInSelfScope({ bill: { ...baseBill, payer: "Shared" }, role: "H" })
      ).toBe(true);
      expect(
        isBillVisibleInSelfScope({ bill: { ...baseBill, payer: "AUTO" }, role: "H" })
      ).toBe(true);
      expect(
        isBillVisibleInSelfScope({ bill: { ...baseBill, payer: undefined }, role: "H" })
      ).toBe(true);
    });
  });

  describe("getScopedBillAmount", () => {
    const amount = 2591.83;

    it("returns full amount when payer matches role", () => {
      const bill = { amount, payer: "H" };
      expect(getScopedBillAmount({ bill, role: "H", billSharing: {} })).toBeCloseTo(
        amount,
        10
      );
    });

    it("returns split amount for shared/auto/unspecified payers", () => {
      const billSharing = { percentageSplit: { H: 0.6, W: 0.4 } };
      const sharedBill = { amount, payer: "Shared" };
      expect(getScopedBillAmount({ bill: sharedBill, role: "H", billSharing })).toBeCloseTo(
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
        getScopedBillAmount({
          bill: unspecified,
          role: "W",
          billSharing: { percentageSplit: { H: 0.7, W: 0.3 } },
        })
      ).toBeCloseTo(amount * 0.3, 10);
    });

    it("returns zero for partner-only bills", () => {
      const bill = { amount, payer: "W" };
      expect(getScopedBillAmount({ bill, role: "H", billSharing: {} })).toBe(0);
    });
  });
});
