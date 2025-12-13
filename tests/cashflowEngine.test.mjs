import assert from "assert/strict";
import { describe, it } from "vitest";
import { projectCashflow, getDateForMonthIndex } from "../src/lib/cashflow/index.js";

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
    const parts = todayStr.split("-");
    const dayOfMonth = parseInt(parts[2], 10);
    const billToday = {
      id: "bill_today",
      name: "Bill Today",
      amount: 50,
      accountId: "acc",
      dueDay: dayOfMonth,
    };
    const bills = [billToday];
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
      months: 1,
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
    const ledgerNames = result.ledger.filter((ev) => ev.kind === "bill").map((ev) => ev.description);
    assert.ok(ledgerNames.includes("Bill Today"), "Bill due today should be included");
    if (dayOfMonth > 1) {
      assert.ok(
        !ledgerNames.includes("Bill Yesterday"),
        "Bill due before today should be excluded when unpaid"
      );
    }
  });

  it("includes same-day expenses in both modes", () => {
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
    const projectedRes = projectCashflow({
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
      mode: "projected",
    });
    const actualHas = actualRes.ledger.some((ev) => ev.kind === "expense" && ev.date === todayStr);
    const projectedHas = projectedRes.ledger.some(
      (ev) => ev.kind === "expense" && ev.date === todayStr
    );
    assert.strictEqual(
      actualHas,
      projectedHas,
      "Both actual and projected modes should include an expense occurring today"
    );
  });
});
