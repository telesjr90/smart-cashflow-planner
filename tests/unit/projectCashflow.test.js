import { describe, it, expect, vi } from "vitest";
import { projectCashflow } from "../../src/lib/cashflow/index.js";
import { getScopedBillAmount } from "../../src/lib/billSharing.js";

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
    mode: "planned",
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

  it("in actual mode: past unpaid bills are excluded, but past paid and future bills remain", () => {
    // Freeze time to after the first bill's due date
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T00:00:00Z"));

    const params = {
      startDate: "2025-12-01",
      months: 2, // Dec + Jan
      accounts: [{ id: "acc1", name: "Checking", openingBalance: 1000 }],
      bills: [{ id: "bill1", name: "Rent", amount: 200, dueDay: 28, accountId: "acc1" }],
      income: { husband: 0, wife: 0 },
      paySchedule: { type: "semi-monthly", day1: 1, day2: 15 },
      allocationRules: [],
      residualAccountId: "acc1",
      paidBills: { "2025-12-28:bill1": true },
      extraIncomes: [],
      expenses: [],
      mode: "actual",
    };

    const result = projectCashflow(params);
    const ledger = result.ledger || [];

    const pastBill = ledger.find(
      (e) => e.kind === "bill" && e.date === "2025-12-28" && e.id === "bill1"
    );
    const futureBill = ledger.find(
      (e) => e.kind === "bill" && e.date === "2026-01-28" && e.id === "bill1"
    );

    expect(pastBill).toBeDefined(); // paid past bill remains
    expect(pastBill.delta).toBeLessThan(0);
    expect(futureBill).toBeDefined();
    expect(futureBill.delta).toBeLessThan(0); // future planned bill

    vi.useRealTimers();
  });

  it("matches helper share math when consumer pre-scopes bills (shared/AUTO 50/50)", () => {
    // Engine does not apply billSharing; consumers pre-scale via getScopedBillAmount.
    const sharedBill = {
      id: "bill-shared",
      name: "Shared Utility",
      amount: 259.18,
      dueDay: 10,
      accountId: "acc1",
      payer: "Shared",
    };

    const scopedAmount = getScopedBillAmount({
      bill: sharedBill,
      role: "H",
      billSharing: { percentageSplit: { H: 0.5, W: 0.5 } },
    });

    const params = {
      ...baseParams,
      bills: [{ ...sharedBill, amount: scopedAmount }],
      months: 1,
      income: { husband: 0, wife: 0 },
    };

    const result = projectCashflow(params);
    const ledgerBill = result.ledger.find((e) => e.kind === "bill" && e.id === "bill-shared");

    expect(scopedAmount).toBeCloseTo(129.59, 2); // 259.18 * 0.5
    expect(ledgerBill).toBeDefined();
    // Engine deltas are in cents and negative for bills; compare in dollars.
    const deltaDollars = Math.abs(ledgerBill.delta) / 100;
    expect(deltaDollars).toBeCloseTo(scopedAmount, 2);
  });

  it("keeps future baseline but overlays expenses in actual mode", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-10T00:00:00Z"));

    const params = {
      ...baseParams,
      startDate: "2025-03-01",
      bills: [{ id: "bill1", name: "Rent", amount: 200, dueDay: 20, accountId: "acc1" }],
      income: { husband: 1000, wife: 0 },
      expenses: [{ id: "ex1", amount: 50, date: "2025-03-05" }],
      mode: "actual",
    };

    const result = projectCashflow(params);
    const incomes = result.ledger.filter((e) => e.kind === "income");
    const bills = result.ledger.filter((e) => e.kind === "bill");
    const expenses = result.ledger.filter((e) => e.kind === "expense");

    expect(incomes.length).toBeGreaterThan(0); // future income retained
    expect(bills.length).toBeGreaterThan(0); // future bills retained
    expect(expenses.length).toBe(1); // expense overlay present only in actual

    vi.useRealTimers();
  });

  it("treats legacy 'projected' mode as planned", () => {
    const params = { ...baseParams, mode: "projected" };
    const planned = projectCashflow({ ...params, mode: "planned" });
    const legacy = projectCashflow(params);
    expect(legacy.monthlySummary[0].net).toEqual(planned.monthlySummary[0].net);
  });

  it("weekly buckets include start/end balances and carry income/bills/expenses/net across weeks", () => {
    const params = {
      ...baseParams,
      startDate: "2025-01-01",
      months: 1,
      bills: [
        { id: "b1", name: "Phone", amount: 100, dueDay: 7, accountId: "acc1" }, // week1
        { id: "b2", name: "Insurance", amount: 50, dueDay: 20, accountId: "acc1" }, // week3
      ],
      income: { husband: 400, wife: 0 }, // pays on day 1 and 15
      paySchedule: { type: "semi-monthly", day1: 1, day2: 15 },
      expenses: [{ id: "ex1", amount: 25, date: "2025-01-05", accountId: "acc1" }],
      mode: "planned",
    };

    const result = projectCashflow(params);
    const weeks = result.monthlySummary?.[0]?.weeks || [];

    expect(weeks.length).toBeGreaterThan(1);

    const w1 = weeks[0];
    const w3 = weeks.find((w) => w.weekIndex === 3);

    expect(w1.startBalanceCents).toBeDefined();
    expect(w1.endBalanceCents).toBe(w1.startBalanceCents + w1.netCents);
    expect(w1.incomeCents).toBeGreaterThan(0);
    expect(w1.billsCents).toBeGreaterThan(0);
    expect(w1.expenseCents).toBeGreaterThanOrEqual(0);

    expect(w3).toBeDefined();
    // later week should start from prior end balance (carry-forward)
    expect(w3.startBalanceCents).toBe(w1.endBalanceCents);
    expect(w3.endBalanceCents).toBe(w3.startBalanceCents + w3.netCents);
  });

  it("keeps baseline in Actual, applies expenses only in Actual, and carries weekly balances with goals", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-10T00:00:00Z"));

    const params = {
      startDate: "2025-01-01",
      months: 1,
      accounts: [{ id: "acc1", name: "Checking", openingBalance: 1000 }],
      bills: [{ id: "bill1", name: "Rent", amount: 200, dueDay: 25, accountId: "acc1" }],
      income: { husband: 500, wife: 0 },
      paySchedule: { type: "semi-monthly", day1: 1, day2: 20 },
      residualAccountId: "acc1",
      expenses: [{ id: "ex1", amount: 40, date: "2025-01-05", accountId: "acc1" }],
      goals: [
        { id: "g-active", perMonth: 100, status: "active", accountId: "acc1" },
        { id: "g-pending", perMonth: 60, status: "pending", accountId: "acc1" },
      ],
      paidBills: {},
      allocationRules: [],
      extraIncomes: [],
    };

    const planned = projectCashflow({ ...params, mode: "planned" });
    const actual = projectCashflow({ ...params, mode: "actual" });

    const plannedMonth = planned.monthlySummary[0];
    const actualMonth = actual.monthlySummary[0];

    // Baseline schedule remains in Actual (future income and bill still present)
    expect(actual.ledger.find((e) => e.kind === "income" && e.date === "2025-01-20")).toBeDefined();
    expect(actual.ledger.find((e) => e.kind === "bill" && e.date === "2025-01-25" && e.id === "bill1")).toBeDefined();

    const week = (summary, idx) => summary.weeks.find((w) => w.weekIndex === idx);
    const plannedW1 = week(plannedMonth, 1);
    const actualW1 = week(actualMonth, 1);

    expect(plannedW1.expenseCents).toBe(0); // Planned ignores expenses
    expect(actualW1.expenseCents).toBe(4000); // Actual overlays expenses

    expect(plannedW1.goalCents).toBe(16000); // Both goals reduce cash in Planned
    expect(actualW1.goalCents).toBe(10000); // Only confirmed/active goal reduces in Actual

    // Weekly carry: end = start + net across all weeks
    const assertWeekCarry = (summary) => {
      summary.weeks.forEach((w) => {
        expect(w.endBalanceCents).toBe(w.startBalanceCents + w.netCents);
      });
    };
    assertWeekCarry(plannedMonth);
    assertWeekCarry(actualMonth);

    vi.useRealTimers();
  });
});
