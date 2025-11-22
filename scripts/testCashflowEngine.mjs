// scripts/testCashflowEngine.mjs
// Simple tests for your shared cash-flow engine.
// Run with:  node ./scripts/testCashflowEngine.mjs

import {
    toCents,
    fromCents,
    enumerateSemiMonthlyPaydays,
    allocateIncome,
    applyOutflow,
    projectCashflow,
  } from "../src/lib/cashflowEngine.js";
  
  // ---------- Tiny test harness ----------
  
  let TOTAL_TESTS = 0;
  let FAILED_TESTS = 0;
  
  function assertEqual(actual, expected, label) {
    TOTAL_TESTS++;
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      FAILED_TESTS++;
      console.error(`❌ [FAIL] ${label}\n   expected: ${e}\n   actual:   ${a}`);
    } else {
      console.log(`✅ [PASS] ${label}`);
    }
  }
  
  async function test(name, fn) {
    try {
      await fn();
    } catch (err) {
      FAILED_TESTS++;
      console.error(`❌ [ERROR] ${name}:`, err);
    }
  }
  
  // ---------- Tests ----------
  
  async function runTests() {
    console.log("=== Cashflow Engine Tests ===\n");
  
    await test("enumerateSemiMonthlyPaydays - simple Jan 2025", () => {
      const dates = enumerateSemiMonthlyPaydays("2025-01-01", 1, {
        type: "semi-monthly",
        day1: 15,
        day2: "last",
      });
      assertEqual(
        dates,
        ["2025-01-15", "2025-01-31"],
        "Paydays 15th and last day in January"
      );
    });
  
    await test("allocateIncome - 100% to one account", () => {
      const balances = { A: 0 };
      const rules = [
        {
          id: "r1",
          accountId: "A",
          kind: "percent",
          value: 100,
          priority: 0,
        },
      ];
      const monthly = {};
      allocateIncome(toCents(1000), rules, monthly, "A", balances);
      assertEqual(fromCents(balances.A), "1000.00", "All income goes to A");
    });
  
    await test("allocateIncome - fixed then percent with residual", () => {
      const balances = { SAV: 0, INV: 0, CHQ: 0 };
      const rules = [
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
      ];
      const monthly = {};
      const total = toCents(2000);
      allocateIncome(total, rules, monthly, "CHQ", balances);
  
      // After allocation:
      // - SAV: 500
      // - Remaining: 1500
      // - INV: 30% of 1500 = 450
      // - Residual (CHQ): 2000 - 500 - 450 = 1050
      assertEqual(fromCents(balances.SAV), "500.00", "SAV gets fixed $500");
      assertEqual(fromCents(balances.INV), "450.00", "INV gets 30% of remaining");
      assertEqual(
        fromCents(balances.CHQ),
        "1050.00",
        "Residual CHQ gets leftover"
      );
    });
  
    await test("allocateIncome - cap on rule", () => {
      const balances = { SAV: 0, CHQ: 0 };
      const rules = [
        {
          id: "r1",
          accountId: "SAV",
          kind: "fixed",
          value: 500,
          priority: 0,
          cap: 300, // only allow $300/month to SAV
        },
      ];
      const monthly = {};
      allocateIncome(toCents(1000), rules, monthly, "CHQ", balances);
  
      // Even though rule wants 500, cap is 300
      assertEqual(fromCents(balances.SAV), "300.00", "Respects monthly cap");
      assertEqual(fromCents(balances.CHQ), "700.00", "Rest goes to residual");
    });
  
    await test("applyOutflow - bill from correct account", () => {
      const balances = { A: toCents(1000), B: toCents(500) };
      applyOutflow("A", toCents(200), balances);
      assertEqual(
        { A: fromCents(balances.A), B: fromCents(balances.B) },
        { A: "800.00", B: "500.00" },
        "Only A is reduced by bill"
      );
    });
  
    await test("rounding - percent splits and residual dust", () => {
      const balances = { A: 0, B: 0, CHQ: 0 };
      const rules = [
        {
          id: "rA",
          accountId: "A",
          kind: "percent",
          value: 33,
          priority: 0,
        },
        {
          id: "rB",
          accountId: "B",
          kind: "percent",
          value: 33,
          priority: 1,
        },
      ];
      const monthly = {};
      // $1.00 total -> 100 cents
      allocateIncome(toCents(1), rules, monthly, "CHQ", balances);
  
      // 33% of 100 = 33 cents for each of A and B (floor).
      // That uses 66 cents; residual gets 34 cents.
      assertEqual(fromCents(balances.A), "0.33", "A gets 0.33");
      assertEqual(fromCents(balances.B), "0.33", "B gets 0.33");
      assertEqual(fromCents(balances.CHQ), "0.34", "Residual gets 0.34");
    });
  
    await test("projectCashflow - simple one-month scenario", () => {
      const result = projectCashflow({
        startDate: "2025-01-01",
        months: 1,
        accounts: [
          { id: "cheq", openingBalance: 0, type: "deposit" },
        ],
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
  
      // One month: income 2000, bills 1000, net 1000, final balance 1000
      assertEqual(
        monthlySummary.length,
        1,
        "Single month summary exists"
      );
      assertEqual(
        fromCents(monthlySummary[0].totalIncome),
        "2000.00",
        "Monthly income is 2000"
      );
      assertEqual(
        fromCents(monthlySummary[0].totalBills),
        "1000.00",
        "Monthly bills are 1000"
      );
      assertEqual(
        fromCents(monthlySummary[0].net),
        "1000.00",
        "Monthly net is 1000"
      );
      assertEqual(
        fromCents(finalBalancesByAccount.cheq),
        "1000.00",
        "Final cheq balance is 1000"
      );
    });
  
    console.log("\n=== Summary ===");
    console.log(`Total tests: ${TOTAL_TESTS}`);
    console.log(`Failed:      ${FAILED_TESTS}`);
    if (FAILED_TESTS === 0) {
      console.log("🎉 All cashflow tests passed.");
    } else {
      console.log("⚠️  Some tests failed. Check logs above.");
    }
  }
  
  runTests();
  