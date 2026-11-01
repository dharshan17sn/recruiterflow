import type { AppState, Category, Expense, Member, Split } from './types.ts';
import sampleData from '../data/sample-data.json';

export const STORAGE_KEY = 'recruiterflow_expense_app_state';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCategory(value: unknown): value is Category {
  return (
    value === 'Food' ||
    value === 'Travel' ||
    value === 'Stay' ||
    value === 'Activities' ||
    value === 'Other'
  );
}

function isMember(value: unknown): value is Member {
  if (!isRecord(value)) {
    return false;
  }
  return isString(value.id) && isString(value.name);
}

function isSplit(value: unknown): value is Split {
  if (!isRecord(value)) {
    return false;
  }
  const splitType = value.type;
  if (splitType === 'equal') {
    if (!Array.isArray(value.memberIds)) {
      return false;
    }
    return value.memberIds.every(isString);
  }
  if (splitType === 'exact') {
    if (!isRecord(value.shares)) {
      return false;
    }
    const keys = Object.keys(value.shares);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === undefined) {
        return false;
      }
      if (!isInteger(value.shares[key])) {
        return false;
      }
    }
    return true;
  }
  if (splitType === 'percent') {
    if (!isRecord(value.shares)) {
      return false;
    }
    const keys = Object.keys(value.shares);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === undefined) {
        return false;
      }
      if (!isNumber(value.shares[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function isExpense(value: unknown): value is Expense {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    isString(value.description) &&
    isInteger(value.amount) &&
    value.amount >= 0 &&
    isString(value.paidBy) &&
    isString(value.date) &&
    isCategory(value.category) &&
    isSplit(value.split)
  );
}

/**
 * Type guard for AppState without any type casts.
 */
export function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) {
    return false;
  }
  if (!Array.isArray(value.members) || !Array.isArray(value.expenses)) {
    return false;
  }
  return value.members.every(isMember) && value.expenses.every(isExpense);
}

/**
 * Returns a cloned copy of the initial sample data as AppState.
 */
export function getSampleState(): AppState {
  const data: unknown = sampleData;
  if (isAppState(data)) {
    return {
      members: data.members.map((m) => ({ id: m.id, name: m.name })),
      expenses: data.expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        paidBy: e.paidBy,
        date: e.date,
        category: e.category,
        split: e.split,
      })),
    };
  }
  return {
    members: [],
    expenses: [],
  };
}

/**
 * Loads application state from localStorage.
 * Performs runtime shape checking and falls back to sample data if missing or corrupt.
 */
export function loadState(): AppState {
  try {
    if (typeof localStorage === 'undefined') {
      return getSampleState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return getSampleState();
    }
    const parsed: unknown = JSON.parse(raw);
    if (isAppState(parsed)) {
      return parsed;
    }
    return getSampleState();
  } catch {
    return getSampleState();
  }
}

/**
 * Saves application state to localStorage wrapped in try/catch.
 */
export function saveState(state: AppState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Gracefully handle storage quota or access errors
  }
}
