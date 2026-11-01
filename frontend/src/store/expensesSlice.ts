import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState, Expense } from '../lib/types.ts';
import { loadState } from '../lib/storage.ts';

export type NewExpensePayload = Omit<Expense, 'id'>;

const initialState: AppState = loadState();

export const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpense: (state, action: PayloadAction<NewExpensePayload>) => {
      const newExpense: Expense = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
      state.expenses.push(newExpense);
    },
    deleteExpense: (state, action: PayloadAction<string>) => {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload);
    },
  },
});

export const { addExpense, deleteExpense } = expensesSlice.actions;
export default expensesSlice.reducer;
