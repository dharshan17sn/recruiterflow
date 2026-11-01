import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, getSampleState, STORAGE_KEY } from './storage.ts';
import type { AppState } from './types.ts';

describe('storage.ts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to sample data when localStorage is empty', () => {
    const state = loadState();
    const sample = getSampleState();

    expect(state.members).toHaveLength(sample.members.length);
    expect(state.expenses).toHaveLength(sample.expenses.length);
    expect(state.members[0]?.name).toBe('Aarav');
  });

  it('falls back to sample data on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{ invalid json');
    const state = loadState();
    const sample = getSampleState();

    expect(state.members).toEqual(sample.members);
    expect(state.expenses).toEqual(sample.expenses);
  });

  it('falls back to sample data when shape validation fails (invalid schema)', () => {
    // Missing members array
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses: [] }));
    let state = loadState();
    expect(state.members).toEqual(getSampleState().members);

    // Invalid member shape (id not string)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        members: [{ id: 123, name: 'Bad Member' }],
        expenses: [],
      }),
    );
    state = loadState();
    expect(state.members).toEqual(getSampleState().members);

    // Invalid expense split
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        members: [{ id: 'm1', name: 'Valid' }],
        expenses: [
          {
            id: 'e1',
            description: 'Test',
            amount: 100,
            paidBy: 'm1',
            date: '2026-03-12',
            category: 'Food',
            split: { type: 'unknown_split' },
          },
        ],
      }),
    );
    state = loadState();
    expect(state.members).toEqual(getSampleState().members);
  });

  it('saves and loads valid application state', () => {
    const customState: AppState = {
      members: [
        { id: 'm1', name: 'Custom User 1' },
        { id: 'm2', name: 'Custom User 2' },
      ],
      expenses: [
        {
          id: 'custom-e1',
          description: 'Lunch',
          amount: 50000,
          paidBy: 'm1',
          date: '2026-03-12',
          category: 'Food',
          split: {
            type: 'equal',
            memberIds: ['m1', 'm2'],
          },
        },
      ],
    };

    saveState(customState);
    const loaded = loadState();
    expect(loaded).toEqual(customState);
  });
});

