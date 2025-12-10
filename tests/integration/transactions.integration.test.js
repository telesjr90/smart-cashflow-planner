import { describe, it, expect, beforeEach } from "vitest";
import { useCashflowStore } from "../../src/store/useCashflowStore";

describe("Transactions integration", () => {
  beforeEach(() => {
    useCashflowStore.getState().reset();
  });

  it("adds and synchronizes expenses/transactions", () => {
    const expenseA = { id: "t1", name: "Coffee", amount: 5.5, date: "2025-01-02" };
    const expenseB = { id: "t2", name: "Groceries", amount: 42, date: "2025-01-03" };

    useCashflowStore.getState().updateExpenses([expenseA, expenseB]);

    expect(useCashflowStore.getState().expenses).toHaveLength(2);
    expect(useCashflowStore.getState().transactions).toHaveLength(2);
    expect(useCashflowStore.getState().transactions[0].id).toBe("t1");
  });
});
