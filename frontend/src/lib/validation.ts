import type { Member, Split } from './types.ts';
import { formatINR, parseRupeesToPaise } from './money.ts';

export interface ExpenseFormSplit {
  type: 'equal' | 'exact' | 'percent';
  memberIds?: string[];
  shares?: Record<string, number | string>;
}

export interface ExpenseFormInput {
  description?: string;
  amount?: string | number;
  paidBy?: string;
  date?: string;
  category?: string;
  split?: ExpenseFormSplit | Split;
  splitType?: 'equal' | 'exact' | 'percent';
  splitMemberIds?: string[];
  splitShares?: Record<string, number | string>;
}

export type ExpenseFormErrors = Record<string, string>;

const MAX_AMOUNT_PAISE = 100000000; // ₹10,00,000 in paise
const VALID_CATEGORIES: readonly string[] = ['Food', 'Travel', 'Stay', 'Activities', 'Other'];

/**
 * Validates an expense form input against all business rules.
 * Returns an errors object mapping field names to error messages.
 */
export function validateExpenseForm(
  input: ExpenseFormInput,
  members: readonly Member[],
  today: string,
): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  // 1. Description validation: required, <= 60 characters
  if (input.description === undefined || input.description === null || input.description.trim() === '') {
    errors.description = 'Description is required';
  } else if (input.description.trim().length > 60) {
    errors.description = 'Description must be at most 60 characters';
  }

  // 2. Amount validation: required, >0 else "Amount must be more than ₹0", <= ₹10,00,000, <= 2 decimals
  let amountInPaise: number | null = null;
  if (input.amount === undefined || input.amount === null || String(input.amount).trim() === '') {
    errors.amount = 'Amount is required';
  } else if (typeof input.amount === 'string') {
    const trimmedAmount = input.amount.trim();
    const sanitized = trimmedAmount.replace(/,/g, '');

    // Check decimal places
    const dotIndex = sanitized.indexOf('.');
    if (dotIndex !== -1 && sanitized.length - dotIndex - 1 > 2) {
      errors.amount = 'Amount must have at most 2 decimal places';
    } else if (trimmedAmount.startsWith('-') || /^-/.test(sanitized)) {
      errors.amount = 'Amount must be more than ₹0';
    } else {
      const parsed = parseRupeesToPaise(trimmedAmount);
      if (parsed === null) {
        errors.amount = 'Amount must be a valid number';
      } else if (parsed <= 0) {
        errors.amount = 'Amount must be more than ₹0';
      } else if (parsed > MAX_AMOUNT_PAISE) {
        errors.amount = `Amount cannot exceed ${formatINR(MAX_AMOUNT_PAISE)}`;
      } else {
        amountInPaise = parsed;
      }
    }
  } else if (typeof input.amount === 'number') {
    if (!Number.isFinite(input.amount)) {
      errors.amount = 'Amount must be a valid number';
    } else if (input.amount <= 0) {
      errors.amount = 'Amount must be more than ₹0';
    } else {
      const numStr = input.amount.toString();
      const dotIndex = numStr.indexOf('.');
      if (dotIndex !== -1 && numStr.length - dotIndex - 1 > 2) {
        errors.amount = 'Amount must have at most 2 decimal places';
      } else {
        const paise = Number.isInteger(input.amount) && input.amount > 1000000
          ? input.amount
          : Math.round(input.amount * 100);

        if (paise > MAX_AMOUNT_PAISE) {
          errors.amount = `Amount cannot exceed ${formatINR(MAX_AMOUNT_PAISE)}`;
        } else {
          amountInPaise = paise;
        }
      }
    }
  }

  // 3. PaidBy validation: required and valid member
  if (input.paidBy === undefined || input.paidBy === null || input.paidBy.trim() === '') {
    errors.paidBy = 'Payer is required';
  } else {
    let memberFound = false;
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m !== undefined && m.id === input.paidBy) {
        memberFound = true;
        break;
      }
    }
    if (!memberFound) {
      errors.paidBy = 'Payer must be a valid member';
    }
  }

  // 4. Date validation: required, not in future
  if (input.date === undefined || input.date === null || input.date.trim() === '') {
    errors.date = 'Date is required';
  } else if (input.date > today) {
    errors.date = 'Date cannot be in the future';
  }

  // 5. Category validation: required
  if (input.category === undefined || input.category === null || !VALID_CATEGORIES.includes(input.category)) {
    errors.category = 'Category is required';
  }

  // 6. Split validation
  const split = input.split;
  const splitType = split?.type ?? input.splitType;
  if (!splitType) {
    errors.split = 'Split configuration is required';
  } else if (splitType === 'equal') {
    let memberIds: readonly string[] = [];
    if (input.splitMemberIds) {
      memberIds = input.splitMemberIds;
    } else if (split && split.type === 'equal') {
      memberIds = split.memberIds ?? [];
    }
    if (memberIds.length === 0) {
      errors.split = 'At least one member must be selected';
    }
  } else if (splitType === 'exact') {
    let rawShares: Record<string, number | string> = {};
    if (input.splitShares) {
      rawShares = input.splitShares;
    } else if (split && split.type === 'exact') {
      rawShares = split.shares ?? {};
    }

    let sharesSum = 0;
    let hasNegative = false;
    let hasInvalidNumber = false;

    const keys = Object.keys(rawShares);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key !== undefined) {
        const val = rawShares[key];
        let sharePaise = 0;

        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.startsWith('-')) {
            hasNegative = true;
          } else {
            const parsed = parseRupeesToPaise(trimmed);
            if (parsed === null) {
              hasInvalidNumber = true;
            } else {
              sharePaise = parsed;
            }
          }
        } else if (typeof val === 'number') {
          if (!Number.isFinite(val) || val < 0) {
            hasNegative = true;
          } else if (Number.isInteger(val)) {
            sharePaise = val;
          } else {
            sharePaise = Math.round(val * 100);
          }
        }

        if (sharePaise < 0) {
          hasNegative = true;
        }
        sharesSum += sharePaise;
      }
    }

    if (hasNegative) {
      errors.split = 'Shares must be at least ₹0';
    } else if (hasInvalidNumber) {
      errors.split = 'Shares must be valid amounts';
    } else if (amountInPaise !== null) {
      const diff = amountInPaise - sharesSum;
      if (diff > 0) {
        errors.split = `${formatINR(diff)} left to assign`;
      } else if (diff < 0) {
        errors.split = `${formatINR(-diff)} over`;
      }
    }
  } else if (splitType === 'percent') {
    let rawShares: Record<string, number | string> = {};
    if (input.splitShares) {
      rawShares = input.splitShares;
    } else if (split && split.type === 'percent') {
      rawShares = split.shares ?? {};
    }

    let percentSum = 0;
    let hasOutOfRange = false;
    let hasTooManyDecimals = false;

    const keys = Object.keys(rawShares);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key !== undefined) {
        const val = rawShares[key];
        let pctNum = 0;

        if (typeof val === 'string') {
          const trimmed = val.trim();
          const dotIndex = trimmed.indexOf('.');
          if (dotIndex !== -1 && trimmed.length - dotIndex - 1 > 2) {
            hasTooManyDecimals = true;
          }
          pctNum = parseFloat(trimmed);
        } else if (typeof val === 'number') {
          const str = val.toString();
          const dotIndex = str.indexOf('.');
          if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
            hasTooManyDecimals = true;
          }
          pctNum = val;
        }

        if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
          hasOutOfRange = true;
        } else {
          percentSum += pctNum;
        }
      }
    }

    if (hasOutOfRange) {
      errors.split = 'Percent shares must be between 0 and 100';
    } else if (hasTooManyDecimals) {
      errors.split = 'Percent shares must have at most 2 decimal places';
    } else {
      const roundedTotal = Math.round(percentSum * 100) / 100;
      if (roundedTotal < 100) {
        const remaining = Math.round((100 - roundedTotal) * 100) / 100;
        errors.split = `${remaining}% remaining`;
      } else if (roundedTotal > 100) {
        const over = Math.round((roundedTotal - 100) * 100) / 100;
        errors.split = `${over}% over`;
      }
    }
  }

  return errors;
}
