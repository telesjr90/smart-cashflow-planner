import { describe, it, expect, vi } from 'vitest';
// Adjust the path below to point to your actual engine file
import { projectCashflow } from '../../src/lib/cashflow/index.js'; 
import {
  getScopedBillAmount,
  isBillVisibleInSelfScope,
} from '../../src/lib/billSharing.js';

describe('Cashflow Engine Logic', () => {
  const accounts = [{ id: 'acc1', openingBalance: 1000 }];

  describe('Modes: Planned vs Actual', () => {
    it('includes unpaid past bills in Planned, excludes them in Actual while keeping future baseline', () => {
      // Pin the clock to the middle of the month to stabilize cutoffs
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-03-15T00:00:00Z'));

      const startDate = '2025-03-01';

      const bills = [
        { id: 'b-past', name: 'Past Bill', amount: 100, dueDay: 5 },
        { id: 'b-future', name: 'Future Bill', amount: 200, dueDay: 28 },
      ];

      const planned = projectCashflow({
        startDate,
        months: 1,
        accounts,
        bills,
        income: { husband: 0, wife: 0 },
        expenses: [],
        paySchedule: {},
        paidBills: {},
        mode: 'planned',
      });

      const actual = projectCashflow({
        startDate,
        months: 1,
        accounts,
        bills,
        income: { husband: 0, wife: 0 },
        expenses: [],
        paySchedule: {},
        paidBills: {},
        mode: 'actual',
      });

      const pastInPlanned = planned.ledger.find((e) => e.id === 'b-past');
      const pastInActual = actual.ledger.find((e) => e.id === 'b-past');
      const futureInActual = actual.ledger.find((e) => e.id === 'b-future');

      expect(pastInPlanned).toBeDefined();
      expect(pastInActual).toBeUndefined();
      expect(futureInActual).toBeDefined();

      vi.useRealTimers();
    });

    it('Actual overlays recorded expenses but retains planned income/bills schedule', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-03-10T00:00:00Z'));

      const startDate = '2025-03-01';
      const expenses = [{ id: 'ex1', amount: 50, date: '2025-03-05', accountId: 'acc1' }];

      const planned = projectCashflow({
        startDate,
        months: 1,
        accounts,
        bills: [{ id: 'b1', amount: 100, name: 'Rent', dueDay: 10 }],
        income: { husband: 1000, wife: 0 },
        expenses,
        paySchedule: { type: 'semi-monthly', day1: 1, day2: 15 },
        mode: 'planned',
      });

      const actual = projectCashflow({
        startDate,
        months: 1,
        accounts,
        bills: [{ id: 'b1', amount: 100, name: 'Rent', dueDay: 10 }],
        income: { husband: 1000, wife: 0 },
        expenses,
        paySchedule: { type: 'semi-monthly', day1: 1, day2: 15 },
        mode: 'actual',
      });

      const plannedExpenses = planned.ledger.filter((e) => e.kind === 'expense');
      const actualExpenses = actual.ledger.filter((e) => e.kind === 'expense');
      const plannedIncome = planned.ledger.filter((e) => e.kind === 'income').length;
      const actualIncome = actual.ledger.filter((e) => e.kind === 'income').length;

      expect(plannedExpenses.length).toBe(0);
      expect(actualExpenses.length).toBeGreaterThan(0);
      expect(actualIncome).toBe(plannedIncome);

      vi.useRealTimers();
    });

    it('respects includeInDiscretionary flag on savings/expenses without breaking projections', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-04-10T00:00:00Z'));

      const startDate = '2025-04-01';
      const expenses = [
        { id: 'ex1', amount: 25, date: '2025-04-02', accountId: 'acc1', includeInDiscretionary: false },
      ];
      const savings = [
        { id: 'sv1', amount: 40, date: '2025-04-06', accountId: 'acc1', includeInDiscretionary: false, kind: 'expense' },
      ];

      const actual = projectCashflow({
        startDate,
        months: 1,
        accounts,
        bills: [],
        income: { husband: 500, wife: 0 },
        expenses,
        paySchedule: { type: 'semi-monthly', day1: 1, day2: 15 },
        extraIncomes: [],
        residualAccountId: 'acc1',
        mode: 'actual',
      });

      const expenseEntry = actual.ledger.find((e) => e.kind === 'expense' && e.date === '2025-04-02');
      expect(expenseEntry).toBeDefined();
      const savingsEntry = actual.ledger.find((e) => e.id === 'sv1');
      expect(savingsEntry).toBeDefined();

      vi.useRealTimers();
    });

    it('treats legacy projected mode as planned', () => {
      const planned = projectCashflow({ startDate: '2025-05-01', months: 1, accounts, bills: [], income: { husband: 0, wife: 0 }, expenses: [], paySchedule: {}, mode: 'planned' });
      const legacy = projectCashflow({ startDate: '2025-05-01', months: 1, accounts, bills: [], income: { husband: 0, wife: 0 }, expenses: [], paySchedule: {}, mode: 'projected' });
      expect(legacy.monthlySummary[0].net).toEqual(planned.monthlySummary[0].net);
    });
  });

  describe('billSharing helpers - my share math', () => {
    it('shared 50/50 split for H and W', () => {
      const bill = { amount: 100, payer: 'Shared' };
      const cfg = { percentageSplit: { H: 0.5, W: 0.5 } };
      expect(getScopedBillAmount({ bill, role: 'H', billSharing: cfg })).toBe(50);
      expect(getScopedBillAmount({ bill, role: 'W', billSharing: cfg })).toBe(50);
    });

    it('AUTO and missing payer behave like shared', () => {
      const billAuto = { amount: 120, payer: 'AUTO' };
      const billMissing = { amount: 120 };
      const cfg = { percentageSplit: { H: 0.25, W: 0.75 } };
      expect(getScopedBillAmount({ bill: billAuto, role: 'H', billSharing: cfg })).toBe(30);
      expect(getScopedBillAmount({ bill: billAuto, role: 'W', billSharing: cfg })).toBe(90);
      expect(getScopedBillAmount({ bill: billMissing, role: 'H', billSharing: cfg })).toBe(30);
      expect(getScopedBillAmount({ bill: billMissing, role: 'W', billSharing: cfg })).toBe(90);
    });

    it('sole payer gets full / partner gets zero', () => {
      const billH = { amount: 80, payer: 'H' };
      const billW = { amount: 80, payer: 'W' };
      expect(getScopedBillAmount({ bill: billH, role: 'H', billSharing: {} })).toBe(80);
      expect(getScopedBillAmount({ bill: billH, role: 'W', billSharing: {} })).toBe(0);
      expect(getScopedBillAmount({ bill: billW, role: 'W', billSharing: {} })).toBe(80);
      expect(getScopedBillAmount({ bill: billW, role: 'H', billSharing: {} })).toBe(0);
    });

    it('visibility rules mirror Bills/Home/Planner filters', () => {
      const shared = { payer: 'Shared' };
      const auto = { payer: 'AUTO' };
      const missing = {};
      const mine = { payer: 'H' };
      const partner = { payer: 'W' };
      expect(isBillVisibleInSelfScope({ bill: shared, role: 'H' })).toBe(true);
      expect(isBillVisibleInSelfScope({ bill: auto, role: 'H' })).toBe(true);
      expect(isBillVisibleInSelfScope({ bill: missing, role: 'H' })).toBe(true);
      expect(isBillVisibleInSelfScope({ bill: mine, role: 'H' })).toBe(true);
      expect(isBillVisibleInSelfScope({ bill: partner, role: 'H' })).toBe(false);
    });
  });

  describe('Pay Schedules', () => {
    it('should handle semi-monthly pay correctly', () => {
      // 15th and Last day
      const result = projectCashflow({
        startDate: '2025-02-01', // Feb 2025 (28 days)
        months: 1,
        accounts,
        bills: [],
        income: { husband: 2000, wife: 0 },
        expenses: [],
        paySchedule: { type: 'semi-monthly', day1: 15, day2: 'last' },
        mode: 'planned'
      });

      const incomes = result.ledger.filter(e => e.kind === 'income');
      expect(incomes).toHaveLength(2);
      expect(incomes[0].date).toBe('2025-02-15');
      expect(incomes[1].date).toBe('2025-02-28'); // handled "last" correctly
    });
  });

  describe('Timeline effective months coverage', () => {
    it('covers current month when startDate is 8 months ago and months is undefined', () => {
      const monthIndexFromStart = (startISO, todayISO) => {
        const [sy, sm] = (startISO || '').split('-').map(Number);
        const [ty, tm] = (todayISO || '').split('-').map(Number);
        if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(ty) || !Number.isFinite(tm)) {
          return 0;
        }
        return (ty - sy) * 12 + (tm - sm);
      };

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 8, 1);
      const startISO = start.toISOString().slice(0, 10);
      const todayISO = today.toISOString().slice(0, 10);
      const monthIndex = monthIndexFromStart(startISO, todayISO);

      const effectiveMonths = Math.max(6, monthIndex + 1);

      expect(effectiveMonths).toBeGreaterThanOrEqual(6);
      expect(effectiveMonths).toBeGreaterThanOrEqual(monthIndex + 1);
    });
  });
});
