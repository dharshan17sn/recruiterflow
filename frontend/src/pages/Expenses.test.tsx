import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createStore } from '../store/index.ts';
import { Expenses } from './Expenses.tsx';
import { NotFound } from './NotFound.tsx';
import type { AppState } from '../lib/types.ts';

function renderExpenses(store = createStore(), initialRoute = '/') {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<Expenses />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('Expenses page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders sample data balances correctly', () => {
    renderExpenses();

    // Verify sample balances calculated via computeBalances
    expect(screen.getByText('Aarav gets back ₹18,554.20')).toBeInTheDocument();
    expect(screen.getByText('Diya owes ₹3,695.78')).toBeInTheDocument();
    expect(screen.getByText('Kabir gets back ₹554.08')).toBeInTheDocument();
    expect(screen.getByText('Meera owes ₹8,112.50')).toBeInTheDocument();
    expect(screen.getByText('Rohan owes ₹7,300.00')).toBeInTheDocument();
  });

  it('category filter changes visible rows and updates total', async () => {
    const user = userEvent.setup();
    renderExpenses();

    // Default "All" shows all 6 expenses and grand total ₹42,249.99
    expect(screen.getByText('Villa booking')).toBeInTheDocument();
    expect(screen.getByText('Beach shack dinner')).toBeInTheDocument();
    expect(screen.getByText('Scuba diving')).toBeInTheDocument();
    expect(screen.getByText('Scooter rental')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Airport cab')).toBeInTheDocument();
    expect(screen.getByText('₹42,249.99')).toBeInTheDocument();

    // Filter by Food (Beach shack dinner ₹3,250.00 + Groceries ₹1,000.00 = ₹4,250.00)
    const filterSelect = screen.getByLabelText(/category filter/i);
    await user.selectOptions(filterSelect, 'Food');

    expect(screen.getByText('Beach shack dinner')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.queryByText('Villa booking')).not.toBeInTheDocument();
    expect(screen.queryByText('Scuba diving')).not.toBeInTheDocument();
    expect(screen.getByText('₹4,250.00')).toBeInTheDocument();
  });

  it('delete with confirm mocked removes row and updates balances immediately', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderExpenses();

    // Find delete button for "Villa booking"
    const deleteVillaBtn = screen.getByRole('button', { name: /delete villa booking/i });
    await user.click(deleteVillaBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByText('Villa booking')).not.toBeInTheDocument();

    // Balances should immediately reflect removal of the ₹24,000 Villa booking
    // Aarav previously had +1855420 paise, now with ₹24,000 paid removed minus his share (480000):
    // His balance becomes 1855420 - 2400000 + 480000 = -64580 paise = owes ₹645.80
    expect(screen.getByText('Aarav owes ₹645.80')).toBeInTheDocument();
  });

  it('does not delete row if confirm is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderExpenses();

    const deleteVillaBtn = screen.getByRole('button', { name: /delete villa booking/i });
    await user.click(deleteVillaBtn);

    expect(screen.getByText('Villa booking')).toBeInTheDocument();
  });

  it('shows empty state when there are no expenses at all', () => {
    const emptyState: AppState = {
      members: [
        { id: 'm1', name: 'Aarav' },
        { id: 'm2', name: 'Diya' },
      ],
      expenses: [],
    };
    const store = createStore({ expenses: emptyState });
    renderExpenses(store);

    expect(
      screen.getByText(/no expenses recorded yet\. click "add expense" to create one\./i),
    ).toBeInTheDocument();
  });

  it('shows empty state when no expenses match the chosen category', async () => {
    const user = userEvent.setup();
    renderExpenses();

    const filterSelect = screen.getByLabelText(/category filter/i);
    // In sample data, none of the expenses are "Other"
    await user.selectOptions(filterSelect, 'Other');

    expect(
      screen.getByText(/no expenses found in category "Other"\./i),
    ).toBeInTheDocument();
  });

  it('renders 404 page for unknown routes with a link to Expenses', () => {
    renderExpenses(undefined, '/some/non-existent-route');

    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /go to expenses/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
