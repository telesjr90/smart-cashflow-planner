import { describe, it, expect } from "vitest";
import { computeBillsDueAmount } from "../../src/pages/Home.jsx";

describe("computeBillsDueAmount", () => {
  const now = new Date("2025-02-10T00:00:00Z");

  it("excludes paid bills using YYYY-MM-DD:billId key", () => {
    const bills = [
      { id: "rent", name: "Rent", amount: 2000, dueDay: 10, payer: "H" },
      { id: "net", name: "Internet", amount: 100, dueDay: 12, payer: "H" },
    ];
    const paidBills = {
      "2025-02-10:rent": true, // mark rent as paid
    };

    const total = computeBillsDueAmount({
      bills,
      role: "H",
      billSharing: {},
      paidBills,
      now,
    });

    expect(total).toBe(100); // only Internet remains unpaid
  });

  it("hides partner-only bills in self scope", () => {
    const bills = [
      { id: "mine", name: "Mine", amount: 50, dueDay: 8, payer: "H" },
      { id: "partner", name: "Partner", amount: 80, dueDay: 9, payer: "W" },
    ];

    const total = computeBillsDueAmount({
      bills,
      role: "H", // self scope: should include only payer H and shared/auto
      billSharing: {},
      paidBills: {},
      now,
    });

    expect(total).toBe(50);
  });

  it("sums scoped amounts in dollars (no cents conversion here)", () => {
    const bills = [
      { id: "a", name: "A", amount: 17.95, dueDay: 8, payer: "H" },
      { id: "b", name: "B", amount: 11.19, dueDay: 9, payer: "H" },
      { id: "c", name: "C", amount: 332.0, dueDay: 15, payer: "H" },
    ];

    const total = computeBillsDueAmount({
      bills,
      role: "H",
      billSharing: {},
      paidBills: {},
      now,
    });

    expect(total).toBeCloseTo(17.95 + 11.19 + 332.0, 2);
  });
});
