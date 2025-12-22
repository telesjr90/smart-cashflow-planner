import { describe, it, expect, vi } from "vitest";
import { buildWeeklyView } from "../../src/MonthlyCashFlowInfographic.jsx";

describe("buildWeeklyView", () => {
  it("uses engine-provided weeks with carry fields and converts cents once", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-10T00:00:00Z"));

    const startDate = "2025-01-01";
    const monthlySummary = [
      {
        totalIncome: 20000, // cents
        totalBills: 5000,
        totalGoals: 10000,
        totalExpenses: 0,
        net: 5000,
        startBalanceCents: 100000,
        endBalanceCents: 105000,
        weeks: [
          {
            weekIndex: 1,
            incomeCents: 20000,
            billsCents: 5000,
            goalCents: 10000,
            expenseCents: 0,
            netCents: 5000,
            startBalanceCents: 100000,
            endBalanceCents: 105000,
          },
        ],
      },
    ];

    const view = buildWeeklyView({ monthlySummary, startDate, ledger: [] });
    const week = view.weeks[0];

    expect(week.startBalance).toBeCloseTo(1000, 2);
    expect(week.endBalance).toBeCloseTo(1050, 2);
    expect(week.income).toBeCloseTo(200, 2);
    expect(week.bills).toBeCloseTo(50, 2);
    expect(week.goals).toBeCloseTo(100, 2);
    expect(week.expenses).toBeCloseTo(0, 2);
    expect(week.net).toBeCloseTo(50, 2);
    expect(week.endBalance).toBeCloseTo(week.startBalance + week.net, 5);

    expect(view.summary.startBalance).toBeCloseTo(1000, 2);
    expect(view.summary.endBalance).toBeCloseTo(1050, 2);

    vi.useRealTimers();
  });

  it("rebuilds weekly buckets from ledger when monthlySummary weeks are missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-15T00:00:00Z"));

    const startDate = "2025-01-01";
    const monthlySummary = [
      {
        totalIncome: 0,
        totalBills: 0,
        net: 0,
        startBalanceCents: 0,
        endBalanceCents: 0,
        weeks: [],
      },
      {
        totalIncome: 20000, // $200
        totalBills: 5000, // $50
        net: 15000, // $150
        startBalanceCents: 100000, // $1,000
        endBalanceCents: 115000, // $1,150
        weeks: [], // missing from engine -> should be reconstructed
      },
    ];

    const ledger = [
      {
        date: "2025-02-10",
        kind: "income",
        delta: 20000,
        monthIndex: 1,
        startBalanceCents: 100000,
        endBalanceCents: 120000,
      },
      {
        date: "2025-02-12",
        kind: "bill",
        delta: -5000,
        monthIndex: 1,
        startBalanceCents: 120000,
        endBalanceCents: 115000,
      },
    ];

    const view = buildWeeklyView({ monthlySummary, ledger, startDate });
    const week = view.weeks[0];

    expect(view.weeks.length).toBeGreaterThan(0);
    expect(week.income).toBeCloseTo(200, 2);
    expect(week.bills).toBeCloseTo(50, 2);
    expect(week.net).toBeCloseTo(150, 2);

    vi.useRealTimers();
  });
});
