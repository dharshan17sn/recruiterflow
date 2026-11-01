import { describe, it, expect } from 'vitest';
import { validateExpenseForm, type ExpenseFormInput } from './validation.ts';
import type { EqualSplit, Member } from './types.ts';

describe('validation.ts', () => {
  const members: Member[] = [
    { id: 'm1', name: 'Aarav' },
    { id: 'm2', name: 'Diya' },
    { id: 'm3', name: 'Kabir' },
  ];
  const today = '2026-03-15';

  const equalSplit: EqualSplit = {
    type: 'equal',
    memberIds: ['m1', 'm2', 'm3'],
  };

  const validForm: ExpenseFormInput = {
    description: 'Team Lunch',
    amount: '1500.00',
    paidBy: 'm1',
    date: '2026-03-14',
    category: 'Food',
    split: equalSplit,
  };

  it('passes on valid form input', () => {
    const errors = validateExpenseForm(validForm, members, today);
    expect(errors).toEqual({});
  });

  describe('description validation', () => {
    it('requires description', () => {
      const errors = validateExpenseForm({ ...validForm, description: '' }, members, today);
      expect(errors.description).toBe('Description is required');

      const errorsSpaces = validateExpenseForm({ ...validForm, description: '   ' }, members, today);
      expect(errorsSpaces.description).toBe('Description is required');
    });

    it('limits description to 60 characters', () => {
      const longDesc = 'a'.repeat(61);
      const errors = validateExpenseForm({ ...validForm, description: longDesc }, members, today);
      expect(errors.description).toBe('Description must be at most 60 characters');

      const exact60 = 'a'.repeat(60);
      const validErrors = validateExpenseForm({ ...validForm, description: exact60 }, members, today);
      expect(validErrors.description).toBeUndefined();
    });
  });

  describe('amount validation', () => {
    it('requires amount', () => {
      const errors = validateExpenseForm({ ...validForm, amount: '' }, members, today);
      expect(errors.amount).toBe('Amount is required');
    });

    it('requires amount > 0 else "Amount must be more than ₹0"', () => {
      const zeroErrors = validateExpenseForm({ ...validForm, amount: '0' }, members, today);
      expect(zeroErrors.amount).toBe('Amount must be more than ₹0');

      const negErrors = validateExpenseForm({ ...validForm, amount: '-50' }, members, today);
      expect(negErrors.amount).toBe('Amount must be more than ₹0');

      const negNumErrors = validateExpenseForm({ ...validForm, amount: -50 }, members, today);
      expect(negNumErrors.amount).toBe('Amount must be more than ₹0');
    });

    it('enforces maximum amount of ₹10,00,000', () => {
      const overErrors = validateExpenseForm({ ...validForm, amount: '1000000.01' }, members, today);
      expect(overErrors.amount).toBe('Amount cannot exceed ₹10,00,000.00');

      const maxErrors = validateExpenseForm({ ...validForm, amount: '1000000.00' }, members, today);
      expect(maxErrors.amount).toBeUndefined();
    });

    it('enforces at most 2 decimal places', () => {
      const errors = validateExpenseForm({ ...validForm, amount: '12.345' }, members, today);
      expect(errors.amount).toBe('Amount must have at most 2 decimal places');
    });
  });

  describe('paidBy validation', () => {
    it('requires paidBy', () => {
      const errors = validateExpenseForm({ ...validForm, paidBy: '' }, members, today);
      expect(errors.paidBy).toBe('Payer is required');
    });

    it('requires paidBy to be an existing member', () => {
      const errors = validateExpenseForm({ ...validForm, paidBy: 'unknown_id' }, members, today);
      expect(errors.paidBy).toBe('Payer must be a valid member');
    });
  });

  describe('date validation', () => {
    it('requires date', () => {
      const errors = validateExpenseForm({ ...validForm, date: '' }, members, today);
      expect(errors.date).toBe('Date is required');
    });

    it('disallows dates in the future', () => {
      const futureErrors = validateExpenseForm({ ...validForm, date: '2026-03-16' }, members, today);
      expect(futureErrors.date).toBe('Date cannot be in the future');

      const todayErrors = validateExpenseForm({ ...validForm, date: '2026-03-15' }, members, today);
      expect(todayErrors.date).toBeUndefined();
    });
  });

  describe('category validation', () => {
    it('requires category to be valid', () => {
      const errors = validateExpenseForm({ ...validForm, category: '' }, members, today);
      expect(errors.category).toBe('Category is required');

      const invalidCatErrors = validateExpenseForm({ ...validForm, category: 'InvalidCategory' }, members, today);
      expect(invalidCatErrors.category).toBe('Category is required');
    });
  });

  describe('split validation', () => {
    it('equal split requires at least 1 member', () => {
      const errors = validateExpenseForm({
        ...validForm,
        split: {
          type: 'equal',
          memberIds: [],
        },
      }, members, today);
      expect(errors.split).toBe('At least one member must be selected');
    });

    describe('exact split', () => {
      it('requires each share to be >= 0', () => {
        const errors = validateExpenseForm({
          ...validForm,
          amount: '100',
          split: {
            type: 'exact',
            shares: {
              m1: -10,
              m2: 110,
            },
          },
        }, members, today);
        expect(errors.split).toBe('Shares must be at least ₹0');
      });

      it('shows "₹12.50 left to assign" when shares sum is less than amount', () => {
        const errors = validateExpenseForm({
          ...validForm,
          amount: '100',
          split: {
            type: 'exact',
            shares: {
              m1: '87.50',
            },
          },
        }, members, today);
        expect(errors.split).toBe('₹12.50 left to assign');
      });

      it('shows "₹10.00 over" when shares sum is more than amount', () => {
        const errors = validateExpenseForm({
          ...validForm,
          amount: '100',
          split: {
            type: 'exact',
            shares: {
              m1: '110.00',
            },
          },
        }, members, today);
        expect(errors.split).toBe('₹10.00 over');
      });
    });

    describe('percent split', () => {
      it('requires each share to be between 0 and 100', () => {
        const errors = validateExpenseForm({
          ...validForm,
          split: {
            type: 'percent',
            shares: {
              m1: 105,
              m2: -5,
            },
          },
        }, members, today);
        expect(errors.split).toBe('Percent shares must be between 0 and 100');
      });

      it('limits percentage decimals to at most 2', () => {
        const errors = validateExpenseForm({
          ...validForm,
          split: {
            type: 'percent',
            shares: {
              m1: 33.333,
              m2: 66.667,
            },
          },
        }, members, today);
        expect(errors.split).toBe('Percent shares must have at most 2 decimal places');
      });

      it('shows remaining percentage when sum is less than 100', () => {
        const errors = validateExpenseForm({
          ...validForm,
          split: {
            type: 'percent',
            shares: {
              m1: 50,
              m2: 40,
            },
          },
        }, members, today);
        expect(errors.split).toBe('10% remaining');
      });

      it('shows over percentage when sum is greater than 100', () => {
        const errors = validateExpenseForm({
          ...validForm,
          split: {
            type: 'percent',
            shares: {
              m1: 60,
              m2: 50,
            },
          },
        }, members, today);
        expect(errors.split).toBe('10% over');
      });

      it('passes when total percentage is exactly 100', () => {
        const errors = validateExpenseForm({
          ...validForm,
          split: {
            type: 'percent',
            shares: {
              m1: 33.33,
              m2: 33.33,
              m3: 33.34,
            },
          },
        }, members, today);
        expect(errors.split).toBeUndefined();
      });
    });
  });
});
