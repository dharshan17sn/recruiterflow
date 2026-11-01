import { configureStore } from '@reduxjs/toolkit';
import expensesReducer from './expensesSlice.ts';
import { loadState, saveState } from '../lib/storage.ts';
import type { AppState } from '../lib/types.ts';

export function createStore(preloadedState?: { expenses: AppState }) {
  const store = configureStore({
    reducer: {
      expenses: expensesReducer,
    },
    preloadedState: preloadedState ?? {
      expenses: loadState(),
    },
  });

  store.subscribe(() => {
    saveState(store.getState().expenses);
  });

  return store;
}

export const store = createStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
