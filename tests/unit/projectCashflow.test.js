import { describe, it, expect } from "vitest";
import { projectCashflow } from "../../src/lib/cashflow/index.js";

describe("projectCashflow", () => {
  const baseParams = {
    startDate: "2025-01-01",
    months: 1,
    accounts: [{ id: "acc1", name: "Checking", openingBalance: 1000 }],
    bills: [{ id: "bill1", name: "Rent", amount: 200, dueDay: 15, accountId: "acc1" }],
    income: { husband: 1000, wife: 0 },
    paySchedule: { type: "semi-monthly", day1: 1, day2: 15 },
    allocationRules: [],
    residualAccountId: "acc1",
    paidBills: {},
    extraIncomes: [],
    expenses: [],
    mode: "projected",
  };

  it("projects income and bills into monthly summary", () => {
    const result = projectCashflow(baseParams);
    const summary = result.monthlySummary?.[0];

    expect(summary).toBeDefined();
    expect(summary.totalIncome).toBeGreaterThan(0);
    expect(summary.totalBills).toBe(20000); // $200 => cents
    expect(summary.net).toEqual(summary.totalIncome - summary.totalBills);
    expect(result.finalBalancesByAccount.acc1).toBeGreaterThan(0);
  });

  it("reuses cached result for identical inputs", () => {
    const first = projectCashflow(baseParams);
    const second = projectCashflow({ ...baseParams });
    expect(second).toBe(first);
  });
});
