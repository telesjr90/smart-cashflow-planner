import { describe, it, expect, beforeEach } from "vitest";
import { useCashflowStore } from "../../src/store/useCashflowStore";

describe("Accounts integration", () => {
  beforeEach(() => {
    // Reset store between tests
    useCashflowStore.getState().reset();
  });

  it("adds and updates accounts with residual assignment", () => {
    const store = useCashflowStore.getState();

    store.updateAccounts(
      [
        { id: "acc-1", name: "Checking", openingBalance: 1000 },
        { id: "acc-2", name: "Savings", openingBalance: 5000 },
      ],
      "acc-1"
    );

    expect(useCashflowStore.getState().accounts).toHaveLength(2);
    expect(useCashflowStore.getState().residualAccountId).toBe("acc-1");

    store.updateAccounts(
      [
        { id: "acc-1", name: "Checking", openingBalance: 2000 },
        { id: "acc-2", name: "Savings", openingBalance: 5500 },
      ],
      "acc-2"
    );

    expect(useCashflowStore.getState().accounts.find((a) => a.id === "acc-1")?.openingBalance).toBe(2000);
    expect(useCashflowStore.getState().residualAccountId).toBe("acc-2");
  });
});
