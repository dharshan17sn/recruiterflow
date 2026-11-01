import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createStore } from '../store/index.ts';
import { AddExpense } from './AddExpense.tsx';
import { Expenses } from './Expenses.tsx';

function renderAddExpense(store = createStore(), initialRoute = '/expenses/new') {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<Expenses />} />
          <Route path="/expenses/new" element={<AddExpense />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('AddExpense page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('submitting empty shows errors beside Description, Amount, Paid by, Category', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderAddExpense(store);

    const initialCount = store.getState().expenses.expenses.length;

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('Payer is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();

    expect(store.getState().expenses.expenses.length).toBe(initialCount);
  });

  it('shows "Amount must be more than ₹0" when negative amount is entered', async () => {
    const user = userEvent.setup();
    renderAddExpense();

    const amountInput = screen.getByLabelText(/^amount/i);
    await user.type(amountInput, '-50');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByText('Amount must be more than ₹0')).toBeInTheDocument();
  });

  it('shows "left to assign" on exact split mismatch', async () => {
    const user = userEvent.setup();
    renderAddExpense();

    await user.type(screen.getByLabelText(/description/i), 'Team Dinner');
    await user.type(screen.getByLabelText(/^amount/i), '100');
    await user.selectOptions(screen.getByLabelText(/paid by/i), 'm1');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Food');

    const exactRadio = screen.getByRole('radio', { name: /exact amounts/i });
    await user.click(exactRadio);

    const aaravExactInput = screen.getByLabelText('Aarav');
    await user.type(aaravExactInput, '87.50');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/₹12\.50 left to assign/i);
  });

  it('shows error when percentage total is not 100', async () => {
    const user = userEvent.setup();
    renderAddExpense();

    await user.type(screen.getByLabelText(/description/i), 'Cab Ride');
    await user.type(screen.getByLabelText(/^amount/i), '500');
    await user.selectOptions(screen.getByLabelText(/paid by/i), 'm1');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Travel');

    const percentRadio = screen.getByRole('radio', { name: /percentages/i });
    await user.click(percentRadio);

    const aaravPercentInput = screen.getByLabelText('Aarav');
    await user.type(aaravPercentInput, '50');
    const diyaPercentInput = screen.getByLabelText('Diya');
    await user.type(diyaPercentInput, '40');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/10% remaining/i);
  });

  it('valid equal split saves, lands on Expenses with "Expense added" and the new row', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderAddExpense(store);

    const initialCount = store.getState().expenses.expenses.length;

    await user.type(screen.getByLabelText(/description/i), 'Special Celebration Dinner');
    await user.type(screen.getByLabelText(/^amount/i), '5000.00');
    await user.selectOptions(screen.getByLabelText(/paid by/i), 'm2'); // Diya
    await user.selectOptions(screen.getByLabelText(/category/i), 'Food');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(await screen.findByRole('status')).toHaveTextContent('Expense added');
    expect(screen.getByText('Special Celebration Dinner')).toBeInTheDocument();
    expect(store.getState().expenses.expenses.length).toBe(initialCount + 1);
  });
});
