import { describe, it, expect } from 'vitest';
import { computeBalances } from './balances.ts';
import { getSampleState } from './storage.ts';
import type { Expense } from './types.ts';

describe('balances.ts', () => {
  const { members, expenses } = getSampleState();

  it('computes balances that sum to exactly 0 on the sample data', () => {
    const balances = computeBalances(expenses, members);

    expect(balances).toEqual({
      m1: 1855420,
      m2: -369578,
      m3: 55408,
      m4: -811250,
      m5: -730000,
    });

    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('handles cases where the payer is not in the split', () => {
    const customExpenses: Expense[] = [
      {
        id: 'payer-not-in-split',
        description: 'Aarav treats Diya and Kabir',
        amount: 6000, // ₹60.00
        paidBy: 'm1', // Aarav paid
        date: '2026-03-12',
        category: 'Food',
        split: {
          type: 'equal',
          memberIds: ['m2', 'm3'], // only Diya and Kabir in split
        },
      },
    ];

    const balances = computeBalances(customExpenses, members);

    // Aarav paid 6000 and owes 0 -> +6000
    // Diya paid 0 and owes 3000 -> -3000
    // Kabir paid 0 and owes 3000 -> -3000
    // Meera and Rohan -> 0
    expect(balances.m1).toBe(6000);
    expect(balances.m2).toBe(-3000);
    expect(balances.m3).toBe(-3000);
    expect(balances.m4).toBe(0);
    expect(balances.m5).toBe(0);

    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('sums to 0 when multiple expenses with mixed split types are processed', () => {
    const mixedExpenses: Expense[] = [
      {
        id: 'exp-1',
        description: 'Percent expense',
        amount: 149999,
        paidBy: 'm1',
        date: '2026-03-15',
        category: 'Travel',
        split: {
          type: 'percent',
          shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
        },
      },
      {
        id: 'exp-2',
        description: 'Equal expense',
        amount: 10000,
        paidBy: 'm2',
        date: '2026-03-16',
        category: 'Food',
        split: {
          type: 'equal',
          memberIds: ['m1', 'm2', 'm3'],
        },
      },
    ];

    const balances = computeBalances(mixedExpenses, members);
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});
