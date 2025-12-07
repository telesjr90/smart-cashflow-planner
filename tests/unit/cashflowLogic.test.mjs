import { describe, it, expect } from 'vitest';
// Adjust the path below to point to your actual engine file
import { projectCashflow } from '../../src/lib/cashflow/index.js'; 

describe('Cashflow Engine Logic', () => {
  const accounts = [{ id: 'acc1', openingBalance: 1000 }];

  describe('Modes: Projected vs Actual', () => {
    it('should include unpaid past bills in Projected mode but exclude in Actual', () => {
      // Setup: Bill due yesterday, unpaid
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const bills = [{ 
        id: 'b1', name: 'Past Bill', amount: 100, dueDay: yesterday.getDate() 
      }];
      
      // Projected
      const resProj = projectCashflow({
        startDate: yesterdayStr,
        months: 1,
        accounts,
        bills,
        income: {},
        expenses: [],
        paySchedule: {},
        paidBills: {},
        mode: 'projected'
      });
      
      // Actual
      const resActual = projectCashflow({
        startDate: yesterdayStr,
        months: 1,
        accounts,
        bills,
        income: {},
        expenses: [],
        paySchedule: {},
        paidBills: {},
        mode: 'actual'
      });

      const billInProj = resProj.ledger.find(e => e.id === 'b1');
      const billInActual = resActual.ledger.find(e => e.id === 'b1');

      expect(billInProj).toBeDefined();
      expect(billInActual).toBeUndefined();
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
        mode: 'projected'
      });

      const incomes = result.ledger.filter(e => e.kind === 'income');
      expect(incomes).toHaveLength(2);
      expect(incomes[0].date).toBe('2025-02-15');
      expect(incomes[1].date).toBe('2025-02-28'); // handled "last" correctly
    });
  });
});