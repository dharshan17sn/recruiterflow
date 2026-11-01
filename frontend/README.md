# Recruiterflow Expense Splitter

A pure TypeScript and React expense sharing application built with Vite, Redux Toolkit, and React Router.

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Vitest test suite
npm run test

# Run typechecking and linting
npm run typecheck
npm run lint

# Production build
npm run build
```

**Unfinished Items**: Editing existing expenses, adding new custom group members, and a debt simplification graph for settled payments.

## Extra-Paisa Rounding Rule

Splits use the largest-remainder method to ensure shares sum exactly to the expense amount:
- **Equal splits**: Base share is `floor(amount / n)`. Leftover paise (`amount % n`) are distributed one by one to the first members in the order of the members list.
- **Percent splits**: Percentages are converted to integer basis points (`round(pct * 100)`). Base share is `floor(amount * bp / 10000)`. Leftover paise are allocated to participants with the largest fractional remainder (`raw % 10000`), breaking ties by member order.
- **Exact splits**: Shares are allocated as specified.

## Key Architectural Decisions

1. **Storage subscription in store (`store.subscribe`)**: Persisting state inside `createStore` establishes a single source of truth for localStorage sync. UI components remain pure and oblivious to persistence details.
2. **Local component state vs. Redux**: Transient input fields, draft split allocations, category filters, and flash notifications live in component or router state. Redux exclusively manages persistent domain entities (`members`, `expenses`).
3. **Pure business logic in `src/lib/`**: Money parsing, balance computations, and validation rules reside in pure TypeScript modules without React dependencies. This guarantees deterministic behavior and clean unit testing.

## Next Steps With Another Day

- Implement a debt-simplification graph algorithm to suggest minimal settlement transactions.
- Add receipt attachment uploads, expense editing, and member addition modals.
- Replace browser `window.confirm` with accessible modal dialogs and ARIA live announcements.

## AI Usage

AI assistants were utilized to assist with initial project scaffolding, rapid drafting of repetitive unit test fixtures, and validating mathematical edge cases. I thoroughly reviewed and verified all implementations, and I can explain every architectural decision and line of code in this codebase.
