import { describe, it, expect } from 'vitest';
import { computeShares } from './split.ts';
import type { Expense, Member } from './types.ts';

describe('split.ts', () => {
  const sampleMembers: Member[] = [
    { id: 'm1', name: 'Aarav' },
    { id: 'm2', name: 'Diya' },
    { id: 'm3', name: 'Kabir' },
    { id: 'm4', name: 'Meera' },
    { id: 'm5', name: 'Rohan' },
  ];

  it('splits ₹100 equal across 3 members as 3334, 3333, 3333', () => {
    const expense: Expense = {
      id: 'test-equal',
      description: 'Equal test ₹100',
      amount: 10000, // ₹100 = 10000 paise
      paidBy: 'm1',
      date: '2026-03-12',
      category: 'Food',
      split: {
        type: 'equal',
        memberIds: ['m1', 'm2', 'm3'],
      },
    };

    const shares = computeShares(expense, sampleMembers);
    expect(shares).toEqual({
      m1: 3334,
      m2: 3333,
      m3: 3333,
    });
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(sum).toBe(10000);
  });

  it('handles the sample e6 percent case where shares sum exactly to 149999', () => {
    const e6: Expense = {
      id: 'e6',
      description: 'Airport cab',
      amount: 149999,
      paidBy: 'm1',
      date: '2026-03-15',
      category: 'Travel',
      split: {
        type: 'percent',
        shares: {
          m1: 33.33,
          m2: 33.33,
          m3: 33.34,
        },
      },
    };

    const shares = computeShares(e6, sampleMembers);
    expect(shares).toEqual({
      m1: 49995,
      m2: 49995,
      m3: 50009,
    });
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(sum).toBe(149999);
  });

  it('handles exact splits by returning shares as given', () => {
    const e3: Expense = {
      id: 'e3',
      description: 'Scuba diving',
      amount: 1050000,
      paidBy: 'm3',
      date: '2026-03-13',
      category: 'Activities',
      split: {
        type: 'exact',
        shares: {
          m3: 350000,
          m4: 350000,
          m5: 350000,
        },
      },
    };

    const shares = computeShares(e3, sampleMembers);
    expect(shares).toEqual({
      m3: 350000,
      m4: 350000,
      m5: 350000,
    });
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1050000);
  });

  it('breaks ties in percent split according to members list order', () => {
    const expense: Expense = {
      id: 'tie-test',
      description: 'Tie percent test',
      amount: 10001, // 10001 paise split 50%-50%
      paidBy: 'm1',
      date: '2026-03-12',
      category: 'Food',
      split: {
        type: 'percent',
        shares: {
          m2: 50,
          m1: 50,
        },
      },
    };

    // Both m1 and m2 have equal remainder (5000). m1 is earlier in sampleMembers than m2.
    const shares = computeShares(expense, sampleMembers);
    expect(shares).toEqual({
      m1: 5001,
      m2: 5000,
    });
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(sum).toBe(10001);
  });
});
