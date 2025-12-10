import { describe, it, expect, beforeEach } from "vitest";
import { useCashflowStore } from "../../src/store/useCashflowStore";

describe("Settings integration", () => {
  beforeEach(() => {
    useCashflowStore.getState().reset();
  });

  it("updates planner settings and bill sharing", () => {
    useCashflowStore.getState().setFullPlanData({
      plannerSettings: {
        startDate: "2025-01-01",
        startingBalance: 500,
        income: { husband: 3000, wife: 2000 },
        paySchedule: { type: "semi-monthly", day1: 15, day2: "last" },
        billSharing: { mode: "manual", percentageSplit: { H: 0.6, W: 0.4 }, sharedBillIds: [] },
        residualAccountId: "acc-1",
        mode: "projected",
      },
    });

    const state = useCashflowStore.getState();
    expect(state.startDate).toBe("2025-01-01");
    expect(state.startingBalance).toBe(500);
    expect(state.income.husband).toBe(3000);
    expect(state.paySchedule.type).toBe("semi-monthly");
    expect(state.billSharing.percentageSplit.H).toBe(0.6);
    expect(state.residualAccountId).toBe("acc-1");
  });
});
