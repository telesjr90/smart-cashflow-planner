import assert from "assert/strict";
import { describe, it } from "vitest";
import { projectCashflow, getDateForMonthIndex } from "../../src/lib/cashflow/index.js";

// Fix timezone for repeatable tests
process.env.TZ = process.env.TZ || "America/Vancouver";

// Helper: generate ISO date strings offset from today
function isoOffset(days) {
  const millis = 24 * 60 * 60 * 1000;
  const target = new Date(Date.now() + days * millis);
  return target.toISOString().slice(0, 10);
}

describe("cashflowEngine", () => {
  // Verify date clamping and leap year behaviour
  it("clamps dates to end of month (including leap years)", () => {
    const feb2025 = getDateForMonthIndex("2025-01-01", 1, 31);
    assert.strictEqual(
      feb2025,
      "2025-02-28",
      "getDateForMonthIndex should clamp day > last day to the last day of the month (non-leap year)"
    );
    const feb2024 = getDateForMonthIndex("2024-01-01", 1, 31);
    assert.strictEqual(
      feb2024,
      "2024-02-29",
      "getDateForMonthIndex should return Feb 29 in leap years when day exceeds month length"
    );
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const accounts = [{ id: "acc", openingBalance: 0 }];

  it("includes an expense occurring today in actual mode", () => {
    const expenses = [{ date: todayStr, amount: 100, description: "Expense Today" }];
    const result = projectCashflow({
      startDate: todayStr,
      months: 1,
      accounts,
      bills: [],
      income: {},
      extraIncomes: [],
      expenses,
      paySchedule: {},
      allocationRules: [],
      residualAccountId: "acc",
      mode: "actual",
    });
    const found = result.ledger.some((ev) => ev.kind === "expense" && ev.date === todayStr);
    assert.ok(found, "Expense on today should be included in actual mode");
  });

  it("excludes future expenses in actual mode", () => {
    const tomorrowStr = isoOffset(1);
    const expenses = [{ date: tomorrowStr, amount: 100, description: "Expense Tomorrow" }];
    const result = projectCashflow({
      startDate: todayStr,
      months: 1,
      accounts,
      bills: [],
      income: {},
      extraIncomes: [],
      expenses,
      paySchedule: {},
      allocationRules: [],
      residualAccountId: "acc",
      mode: "actual",
    });
    const found = result.ledger.some((ev) => ev.kind === "expense" && ev.date === tomorrowStr);
    assert.ok(!found, "Expense after today should be excluded in actual mode");
  });

  it("filters bills in actual mode based on today", () => {
    // Actual mode hides unpaid bills dated today or earlier; future bills stay planned.
    const parts = todayStr.split("-");
    const dayOfMonth = parseInt(parts[2], 10);
    const tomorrowParts = isoOffset(1).split("-");
    const tomorrowDay = parseInt(tomorrowParts[2], 10);
    const billToday = {
      id: "bill_today",
      name: "Bill Today",
      amount: 50,
      accountId: "acc",
      dueDay: dayOfMonth,
    };
    const bills = [billToday];
    bills.push({
      id: "bill_future",
      name: "Bill Future",
      amount: 50,
      accountId: "acc",
      dueDay: tomorrowDay,
    });
    if (dayOfMonth > 1) {
      bills.push({
        id: "bill_yesterday",
        name: "Bill Yesterday",
        amount: 50,
        accountId: "acc",
        dueDay: dayOfMonth - 1,
      });
    }
    const startOfMonth = `${parts[0]}-${parts[1]}-01`;
    const result = projectCashflow({
      startDate: startOfMonth,
      months: 2,
      accounts,
      bills,
      income: {},
      extraIncomes: [],
      expenses: [],
      paySchedule: {},
      allocationRules: [],
      residualAccountId: "acc",
      mode: "actual",
    });
    const billEntries = result.ledger.filter((ev) => ev.kind === "bill");
    const onOrBeforeToday = billEntries
      .filter((ev) => ev.date <= todayStr)
      .map((ev) => ev.description);
    assert.deepStrictEqual(
      onOrBeforeToday,
      [],
      "Unpaid bill events dated today or earlier should be hidden in actual mode"
    );
    const futureNames = Array.from(
      new Set(billEntries.filter((ev) => ev.date > todayStr).map((ev) => ev.description))
    ).sort();
    const expectedNames = bills.map((b) => b.name).sort();
    assert.deepStrictEqual(
      futureNames,
      expectedNames,
      "Future-dated bill events remain visible/planned in actual mode"
    );
  });

  it("includes same-day expenses only in actual mode (planned ignores overlays)", () => {
    const expenses = [{ date: todayStr, amount: 75, description: "Same Day Expense" }];
    const actualRes = projectCashflow({
      startDate: todayStr,
      months: 1,
      accounts,
      bills: [],
      income: {},
      extraIncomes: [],
      expenses,
      paySchedule: {},
      allocationRules: [],
      residualAccountId: "acc",
      mode: "actual",
    });
    const plannedRes = projectCashflow({
      startDate: todayStr,
      months: 1,
      accounts,
      bills: [],
      income: {},
      extraIncomes: [],
      expenses,
      paySchedule: {},
      allocationRules: [],
      residualAccountId: "acc",
      mode: "planned",
    });
    const actualHas = actualRes.ledger.some((ev) => ev.kind === "expense" && ev.date === todayStr);
    const plannedHas = plannedRes.ledger.some((ev) => ev.kind === "expense" && ev.date === todayStr);
    assert.ok(actualHas, "Actual mode should include an expense occurring today");
    assert.ok(!plannedHas, "Planned mode should ignore recorded expenses");
  });
});
