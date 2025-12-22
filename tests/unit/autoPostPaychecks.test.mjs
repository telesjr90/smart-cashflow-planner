import { describe, it, expect, vi } from "vitest";
import { autoPostPaychecks } from "../../src/lib/income/autoPostPaychecks.js";

describe("autoPostPaychecks", () => {
  const schedule = { type: "semi-monthly", day1: 5, day2: 20 };
  const depositAccountId = "acc-primary";

  it("emits paychecks for semi-monthly day1/day2 when past or today", () => {
    const { newTransactions, debug } = autoPostPaychecks({
      todayISO: "2025-01-20",
      paySchedule: schedule,
      income: { husband: 1000, wife: 0 },
      existingTransactions: [],
      depositAccountId,
    });

    expect(debug.candidateDates).toEqual(["2025-01-05", "2025-01-20"]);
    expect(newTransactions).toHaveLength(2);
    expect(newTransactions[0]).toMatchObject({
      type: "income",
      category: "salary",
      accountId: depositAccountId,
    });
    const ids = newTransactions.map((tx) => tx.id);
    expect(ids).toContain("auto-paycheck:husband:2025-01-05:100000:acc-primary");
    expect(ids).toContain("auto-paycheck:husband:2025-01-20:100000:acc-primary");
  });

  it("skips creating a duplicate if an auto paycheck already exists", () => {
    const existingId = "auto-paycheck:husband:2025-01-05:100000:acc-primary";
    const { newTransactions } = autoPostPaychecks({
      todayISO: "2025-01-20",
      paySchedule: schedule,
      income: { husband: 1000, wife: 0 },
      existingTransactions: [{ id: existingId }],
      depositAccountId,
    });

    expect(newTransactions).toHaveLength(1);
    expect(newTransactions[0].id).toBe("auto-paycheck:husband:2025-01-20:100000:acc-primary");
  });

  it("returns none when today is before the first payday of the month", () => {
    const result = autoPostPaychecks({
      todayISO: "2025-01-04",
      paySchedule: schedule,
      income: { husband: 1000, wife: 0 },
      existingTransactions: [],
      depositAccountId,
    });

    expect(result.newTransactions).toHaveLength(0);
  });

  it("returns one when today is after the first payday but before the second", () => {
    const { newTransactions } = autoPostPaychecks({
      todayISO: "2025-01-06",
      paySchedule: schedule,
      income: { husband: 0, wife: 500 },
      existingTransactions: [],
      depositAccountId,
    });

    expect(newTransactions).toHaveLength(1);
    expect(newTransactions[0]).toMatchObject({
      id: "auto-paycheck:wife:2025-01-05:50000:acc-primary",
      amount: 500,
      type: "income",
      category: "salary",
    });
  });

  it("posts once on payday, bumps balance, and is idempotent on rerun", () => {
    const todayISO = "2025-01-05";
    const account = { id: depositAccountId, currentBalanceCents: 0 };
    const first = autoPostPaychecks({
      todayISO,
      paySchedule: schedule,
      income: { husband: 250, wife: 0 },
      existingTransactions: [],
      depositAccountId,
    });

    expect(first.newTransactions).toHaveLength(1);
    const tx = first.newTransactions[0];
    expect(tx).toMatchObject({
      id: `auto-paycheck:husband:${todayISO}:25000:${depositAccountId}`,
      date: todayISO,
      amount: 250,
      category: "salary",
      type: "income",
    });

    const updatedBalanceCents = account.currentBalanceCents + Math.round(tx.amount * 100);
    expect(updatedBalanceCents).toBe(25000);

    // Rerun with the posted transaction present: no duplicates, no balance change
    const second = autoPostPaychecks({
      todayISO,
      paySchedule: schedule,
      income: { husband: 250, wife: 0 },
      existingTransactions: [...first.newTransactions],
      depositAccountId,
    });
    expect(second.newTransactions).toHaveLength(0);
    expect(updatedBalanceCents).toBe(25000);
  });

  it("skips auto-post before hydration or without accounts", async () => {
    vi.resetModules();
    vi.doMock("../../src/firebase", () => ({ auth: null, db: null }));
    vi.doMock("firebase/auth", () => ({
      onAuthStateChanged: vi.fn(),
    }));
    vi.doMock("firebase/firestore", () => ({
      collection: vi.fn(),
      doc: vi.fn(),
      getDoc: vi.fn(),
      getDocs: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      onSnapshot: vi.fn(),
      serverTimestamp: vi.fn(),
      setDoc: vi.fn(),
      runTransaction: vi.fn(),
    }));

    const { maybeRunAutoPostPaychecks } = await import("../../src/hooks/useCashflowData.js");

    const dataWithAccounts = {
      paySchedule: schedule,
      income: { husband: 500, wife: 0 },
      startDate: "2025-01-01",
      expenses: [],
      accounts: [{ id: depositAccountId }],
      residualAccountId: depositAccountId,
    };

    const setLastRun = vi.fn();
    const resultPreHydration = await maybeRunAutoPostPaychecks({
      myData: dataWithAccounts,
      todayISO: "2025-01-20",
      hasHydrated: false,
      fallbackHydrated: false,
      lastAutoPostRunISO: null,
      setLastAutoPostRunISO: setLastRun,
      handleUpdateExpenses: vi.fn(),
      handleUpdateAccounts: vi.fn(),
      runGuardRef: { current: null },
    });

    expect(resultPreHydration.ran).toBe(false);
    expect(setLastRun).not.toHaveBeenCalled();

    const resultNoAccounts = await maybeRunAutoPostPaychecks({
      myData: { ...dataWithAccounts, accounts: [] },
      todayISO: "2025-01-20",
      hasHydrated: true,
      fallbackHydrated: false,
      lastAutoPostRunISO: null,
      setLastAutoPostRunISO: setLastRun,
      handleUpdateExpenses: vi.fn(),
      handleUpdateAccounts: vi.fn(),
      runGuardRef: { current: null },
    });

    expect(resultNoAccounts.ran).toBe(false);
    expect(setLastRun).not.toHaveBeenCalled();
  });

  it("runs auto-post once per day even if invoked twice", async () => {
    vi.resetModules();
    vi.doMock("../../src/firebase", () => ({ auth: null, db: null }));
    vi.doMock("firebase/auth", () => ({
      onAuthStateChanged: vi.fn(),
    }));
    vi.doMock("firebase/firestore", () => ({
      collection: vi.fn(),
      doc: vi.fn(),
      getDoc: vi.fn(),
      getDocs: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      onSnapshot: vi.fn(),
      serverTimestamp: vi.fn(),
      setDoc: vi.fn(),
      runTransaction: vi.fn(),
    }));

    const { maybeRunAutoPostPaychecks } = await import("../../src/hooks/useCashflowData.js");

    const handleUpdateExpenses = vi.fn(() => Promise.resolve());
    const handleUpdateAccounts = vi.fn(() => Promise.resolve());
    const setLastRun = vi.fn();
    const runGuardRef = { current: null };

    const myData = {
      paySchedule: schedule,
      income: { husband: 300, wife: 0 },
      startDate: "2025-01-01",
      expenses: [],
      accounts: [{ id: depositAccountId, currentBalanceCents: 0 }],
      residualAccountId: depositAccountId,
    };

    const first = await maybeRunAutoPostPaychecks({
      myData,
      todayISO: "2025-01-20",
      hasHydrated: true,
      fallbackHydrated: false,
      lastAutoPostRunISO: null,
      setLastAutoPostRunISO: setLastRun,
      handleUpdateExpenses,
      handleUpdateAccounts,
      runGuardRef,
    });

    expect(first.ran).toBe(true);
    expect(handleUpdateExpenses).toHaveBeenCalledTimes(1);
    expect(handleUpdateAccounts).toHaveBeenCalledTimes(1);
    expect(setLastRun).toHaveBeenCalledWith("2025-01-20");

    const updatedAccounts = handleUpdateAccounts.mock.calls[0][0];
    const updatedAccount = updatedAccounts.find((acc) => acc.id === depositAccountId);
    const depositedCents = first.newTransactions.reduce(
      (sum, tx) => sum + Math.round(tx.amount * 100),
      0
    );
    expect(updatedAccount).toMatchObject({
      id: depositAccountId,
      currentBalanceCents: depositedCents,
      currentBalance: depositedCents / 100,
    });

    const second = await maybeRunAutoPostPaychecks({
      myData,
      todayISO: "2025-01-20",
      hasHydrated: true,
      fallbackHydrated: false,
      lastAutoPostRunISO: "2025-01-20",
      setLastAutoPostRunISO: setLastRun,
      handleUpdateExpenses,
      handleUpdateAccounts,
      runGuardRef,
    });

    expect(second.ran).toBe(false);
    expect(handleUpdateExpenses).toHaveBeenCalledTimes(1);
    expect(handleUpdateAccounts).toHaveBeenCalledTimes(1);
    expect(setLastRun).toHaveBeenCalledTimes(1);
  });
});
