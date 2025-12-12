// scripts/testCashflowEngine.mjs
// Simple tests for your shared cash-flow engine.
// Run with:  node ./scripts/testCashflowEngine.mjs

import {
  toCents,
  fromCents,
  enumeratePaydays,
  projectCashflow,
} from "../src/lib/cashflow/index.js";

// ---------- Tiny test harness ----------

let TOTAL_TESTS = 0;
let FAILED_TESTS = 0;

function assertEqual(actual, expected, label) {
  TOTAL_TESTS++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    FAILED_TESTS++;
    console.error(`✗ [FAIL] ${label}\n   expected: ${e}\n   actual:   ${a}`);
  } else {
    console.log(`✓ [PASS] ${label}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
  } catch (err) {
    FAILED_TESTS++;
    console.error(`✗ [ERROR] ${name}:`, err);
  }
}

// ---------- Tests ----------

async function runTests() {
  console.log("=== Cashflow Engine Tests ===\n");

  await test("enumeratePaydays - simple Jan 2025", () => {
    const dates = enumeratePaydays("2025-01-01", 1, {
      type: "semi-monthly",
      day1: 15,
      day2: "last",
    });
    assertEqual(
      dates,
      [
        { date: "2025-01-15", monthIndex: 0 },
        { date: "2025-01-31", monthIndex: 0 },
      ],
      "Paydays 15th and last day in January"
    );
  });

  await test("projectCashflow allocations - 100% to one account", () => {
    const result = projectCashflow({
      startDate: "2025-01-01",
      months: 1,
      accounts: [{ id: "A", openingBalance: 0 }],
      bills: [],
      income: { husband: 1000 },
      paySchedule: { type: "monthly" },
      allocationRules: [
        {
          id: "all-to-A",
          accountId: "A",
          kind: "percent",
          value: 100,
          priority: 0,
        },
      ],
      residualAccountId: "A",
    });
    assertEqual(fromCents(result.finalBalancesByAccount.A), "1000.00", "All income goes to A");
  });

  await test("projectCashflow allocations - fixed then percent with residual", () => {
    const result = projectCashflow({
      startDate: "2025-01-01",
      months: 1,
      accounts: [
        { id: "SAV", openingBalance: 0 },
        { id: "INV", openingBalance: 0 },
        { id: "CHQ", openingBalance: 0 },
      ],
      bills: [],
      income: { husband: 2000 },
      paySchedule: { type: "monthly" },
      allocationRules: [
        {
          id: "fixedSave",
          accountId: "SAV",
          kind: "fixed",
          value: 500,
          priority: 0,
        },
        {
          id: "percentInvest",
          accountId: "INV",
          kind: "percent",
          value: 30,
          priority: 1,
        },
      ],
      residualAccountId: "CHQ",
    });

    const balances = {
      SAV: fromCents(result.finalBalancesByAccount.SAV),
      INV: fromCents(result.finalBalancesByAccount.INV),
      CHQ: fromCents(result.finalBalancesByAccount.CHQ),
    };

    assertEqual(balances.SAV, "500.00", "SAV gets fixed $500");
    assertEqual(balances.INV, "450.00", "INV gets 30% of remaining");
    assertEqual(balances.CHQ, "1050.00", "Residual CHQ gets leftover");
  });

  await test("projectCashflow allocations - rounding on percent splits", () => {
    const result = projectCashflow({
      startDate: "2025-01-01",
      months: 1,
      accounts: [
        { id: "A", openingBalance: 0 },
        { id: "B", openingBalance: 0 },
        { id: "CHQ", openingBalance: 0 },
      ],
      bills: [],
      income: { husband: 1 }, // $1 total income
      paySchedule: { type: "monthly" },
      allocationRules: [
        { id: "rA", accountId: "A", kind: "percent", value: 33, priority: 0 },
        { id: "rB", accountId: "B", kind: "percent", value: 33, priority: 1 },
      ],
      residualAccountId: "CHQ",
    });

    const balances = {
      A: fromCents(result.finalBalancesByAccount.A),
      B: fromCents(result.finalBalancesByAccount.B),
      CHQ: fromCents(result.finalBalancesByAccount.CHQ),
    };

    assertEqual(balances.A, "0.33", "A gets 0.33");
    assertEqual(balances.B, "0.33", "B gets 0.33");
    assertEqual(balances.CHQ, "0.34", "Residual gets 0.34");
  });

  await test("projectCashflow - bill debits correct account", () => {
    const result = projectCashflow({
      startDate: "2025-01-01",
      months: 1,
      accounts: [
        { id: "A", openingBalance: fromCents.toString ? 0 : 0, type: "deposit" },
        { id: "B", openingBalance: 0, type: "deposit" },
      ],
      bills: [
        {
          id: "rent",
          name: "Rent",
          amount: 200,
          dueDay: 1,
          accountId: "A",
        },
      ],
      income: {},
      paySchedule: { type: "monthly" },
      allocationRules: [],
      residualAccountId: "A",
      paidBills: {},
    });

    const balances = {
      A: fromCents(result.finalBalancesByAccount.A),
      B: fromCents(result.finalBalancesByAccount.B),
    };

    assertEqual(balances.A, "-200.00", "A reduced by bill amount");
    assertEqual(balances.B, "0.00", "B unchanged");
  });

  await test("projectCashflow - simple one-month scenario", () => {
    const result = projectCashflow({
      startDate: "2025-01-01",
      months: 1,
      accounts: [{ id: "cheq", openingBalance: 0, type: "deposit" }],
      bills: [
        {
          id: "rent",
          name: "Rent",
          amount: 1000,
          dueDay: 15,
          accountId: "cheq",
        },
      ],
      income: { husband: 2000, wife: 0 },
      paySchedule: {
        type: "semi-monthly",
        day1: 15,
        day2: "last",
      },
      allocationRules: [
        {
          id: "all-to-cheq",
          accountId: "cheq",
          kind: "percent",
          value: 100,
          priority: 0,
        },
      ],
      residualAccountId: "cheq",
      paidBills: {},
    });

    const { monthlySummary, finalBalancesByAccount } = result;

    assertEqual(monthlySummary.length, 1, "Single month summary exists");
    assertEqual(fromCents(monthlySummary[0].totalIncome), "4000.00", "Monthly income is 4000 (two paydays)");
    assertEqual(fromCents(monthlySummary[0].totalBills), "1000.00", "Monthly bills are 1000");
    assertEqual(fromCents(monthlySummary[0].net), "3000.00", "Monthly net is 3000");
    assertEqual(fromCents(finalBalancesByAccount.cheq), "3000.00", "Final cheq balance is 3000");
  });

  console.log("\n=== Summary ===");
  console.log(`Total tests: ${TOTAL_TESTS}`);
  console.log(`Failed:      ${FAILED_TESTS}`);
  if (FAILED_TESTS === 0) {
    console.log("✅ All cashflow tests passed.");
  } else {
    console.log("⚠️  Some tests failed. Check logs above.");
  }
}

runTests();
