import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks.ts';
import { deleteExpense } from '../store/expensesSlice.ts';
import { computeBalances } from '../lib/balances.ts';
import { formatINR } from '../lib/money.ts';
import type { Split } from '../lib/types.ts';

function getFlashMessage(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'flash' in state) {
    const val = state.flash;
    if (typeof val === 'string') {
      return val;
    }
  }
  return null;
}

export function Expenses() {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const members = useAppSelector((state) => state.expenses.members);
  const expenses = useAppSelector((state) => state.expenses.expenses);

  const [flash, setFlash] = useState<string | null>(() => getFlashMessage(location.state));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (flash !== null) {
      window.history.replaceState({}, document.title);
    }
  }, [flash]);

  const balances = computeBalances(expenses, members);

  const filteredExpenses =
    selectedCategory === 'All'
      ? expenses
      : expenses.filter((e) => e.category === selectedCategory);

  const totalPaise = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Sort by date descending; tie: newest added first (reverse then stable sort)
  const sortedExpenses = [...filteredExpenses]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const formatSplit = (split: Split): string => {
    if (split.type === 'equal') {
      const count = split.memberIds.length;
      return `Equally, ${count} ${count === 1 ? 'person' : 'people'}`;
    }
    if (split.type === 'exact') {
      return 'Exact amounts';
    }
    return 'Percentages';
  };

  const handleDelete = (id: string, description: string) => {
    if (window.confirm(`Are you sure you want to delete "${description}"?`)) {
      dispatch(deleteExpense(id));
    }
  };

  return (
    <div className="page-container">
      {flash && (
        <div role="status" className="flash-message">
          {flash}
          <button
            type="button"
            className="flash-close-btn"
            aria-label="Dismiss notification"
            onClick={() => setFlash(null)}
          >
            ×
          </button>
        </div>
      )}

      <header className="page-header">
        <h1>Expenses</h1>
      </header>

      <section className="balances-section" aria-labelledby="balances-heading">
        <h2 id="balances-heading">Balances</h2>
        <ul className="balances-list">
          {members.map((m) => {
            const bal = balances[m.id] ?? 0;
            let statusText = `${m.name} settled up`;
            if (bal > 0) {
              statusText = `${m.name} gets back ${formatINR(bal)}`;
            } else if (bal < 0) {
              statusText = `${m.name} owes ${formatINR(-bal)}`;
            }
            return (
              <li key={m.id} className="balance-item">
                {statusText}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="expenses-section" aria-labelledby="expenses-heading">
        <div className="expenses-toolbar">
          <div className="filter-group">
            <label htmlFor="category-filter">Category filter</label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Stay">Stay</option>
              <option value="Activities">Activities</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="total-display">
            <span>Total: </span>
            <strong>{formatINR(totalPaise)}</strong>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses recorded yet. Click &quot;Add expense&quot; to create one.</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses found in category &quot;{selectedCategory}&quot;.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="expenses-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col">Paid by</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Split</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.date}</td>
                    <td>{expense.description}</td>
                    <td>
                      <span className="category-badge">{expense.category}</span>
                    </td>
                    <td>{memberMap.get(expense.paidBy) ?? expense.paidBy}</td>
                    <td>{formatINR(expense.amount)}</td>
                    <td>{formatSplit(expense.split)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        aria-label={`Delete ${expense.description}`}
                        onClick={() => handleDelete(expense.id, expense.description)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
