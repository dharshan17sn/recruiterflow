import type { Expense, Member } from './types.ts';
import { computeShares } from './split.ts';

/**
 * Computes net balances for all members in integer paise.
 * Balance = total amount paid by member - total share owed by member.
 * A positive balance means the member is owed money.
 * A negative balance means the member owes money.
 * The payer does not need to be in the expense split.
 * The sum of all balances across all members is mathematically guaranteed to equal 0.
 */
export function computeBalances(
  expenses: readonly Expense[],
  members: readonly Member[],
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (member !== undefined) {
      balances[member.id] = 0;
    }
  }

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (expense !== undefined) {
      const currentPaid = balances[expense.paidBy] ?? 0;
      balances[expense.paidBy] = currentPaid + expense.amount;

      const shares = computeShares(expense, members);
      for (const memberId of Object.keys(shares)) {
        const share = shares[memberId];
        if (share !== undefined) {
          const currentBal = balances[memberId] ?? 0;
          balances[memberId] = currentBal - share;
        }
      }
    }
  }

  return balances;
}
