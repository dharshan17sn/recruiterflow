import type { Expense, Member } from './types.ts';

/**
 * Rounding rule: Largest-Remainder Method (Hare-Niemeyer method).
 *
 * 1. Equal Split:
 *    - Base share: base = Math.floor(amount / n)
 *    - Leftover paise: leftover = amount % n
 *    - Leftover paise are distributed one each to the first `leftover` members
 *      in the order they appear in the provided `members` list.
 *    - Example: ₹100 (10,000 paise) split equally among 3 members:
 *      base = 3,333 paise, leftover = 1 paise.
 *      Member 1 gets 3,334 paise, Member 2 gets 3,333 paise, Member 3 gets 3,333 paise.
 *      Total sum = 10,000 paise.
 *
 * 2. Percent Split:
 *    - Basis points: bp = Math.round(pct * 100) (integer basis points from percentage).
 *    - Unrounded share: rawNumerator = amount * bp.
 *    - Base share: base = Math.floor(rawNumerator / 10000).
 *    - Fractional remainder: remainder = rawNumerator % 10000.
 *    - Leftover paise = amount - sum(base).
 *    - Leftover paise are assigned one each to members having the largest fractional
 *      remainder (descending). Any ties in fractional remainder are broken by the order
 *      of members in the provided `members` list.
 *    - Example: ₹1,499.99 (149,999 paise) split with 33.33%, 33.33%, 33.34%:
 *      m1 (33.33%): raw = 499,946,667, base = 49,994, rem = 6,667.
 *      m2 (33.33%): raw = 499,946,667, base = 49,994, rem = 6,667.
 *      m3 (33.34%): raw = 500,096,666, base = 50,009, rem = 6,666.
 *      Base sum = 149,997, leftover = 2 paise.
 *      m1 and m2 have the largest remainder (6,667 > 6,666), so each receives +1 paise.
 *      Shares: m1 = 49,995, m2 = 49,995, m3 = 50,009. Total sum = 149,999 paise.
 *
 * 3. Exact Split:
 *    - Shares are used directly as specified in the split.
 *
 * Guarantees:
 * - Sum of computed shares always matches `expense.amount` exactly.
 */
export function computeShares(
  expense: Expense,
  members: readonly Member[],
): Record<string, number> {
  const { amount, split } = expense;

  if (split.type === 'exact') {
    const result: Record<string, number> = {};
    for (const key of Object.keys(split.shares)) {
      const share = split.shares[key];
      if (share !== undefined) {
        result[key] = share;
      }
    }
    return result;
  }

  const memberOrder = new Map<string, number>();
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (member !== undefined) {
      memberOrder.set(member.id, i);
    }
  }

  if (split.type === 'equal') {
    const participantIds = split.memberIds;
    if (participantIds.length === 0) {
      return {};
    }

    const sortedIds = [...participantIds].sort((a, b) => {
      const orderA = memberOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
      const orderB = memberOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    const n = sortedIds.length;
    const base = Math.floor(amount / n);
    const leftover = amount % n;

    const result: Record<string, number> = {};
    for (let i = 0; i < sortedIds.length; i++) {
      const id = sortedIds[i];
      if (id !== undefined) {
        result[id] = base + (i < leftover ? 1 : 0);
      }
    }
    return result;
  }

  if (split.type === 'percent') {
    const shareKeys = Object.keys(split.shares);
    if (shareKeys.length === 0) {
      return {};
    }

    interface PercentItem {
      id: string;
      base: number;
      remainder: number;
      order: number;
    }

    const items: PercentItem[] = [];
    let allocatedSum = 0;

    for (let i = 0; i < shareKeys.length; i++) {
      const id = shareKeys[i];
      if (id !== undefined) {
        const pct = split.shares[id] ?? 0;
        const bp = Math.round(pct * 100);
        const rawNumerator = amount * bp;
        const base = Math.floor(rawNumerator / 10000);
        const remainder = rawNumerator % 10000;
        const order = memberOrder.get(id) ?? Number.MAX_SAFE_INTEGER;

        allocatedSum += base;
        items.push({ id, base, remainder, order });
      }
    }

    const leftover = amount - allocatedSum;

    items.sort((a, b) => {
      if (b.remainder !== a.remainder) {
        return b.remainder - a.remainder;
      }
      return a.order - b.order;
    });

    const result: Record<string, number> = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item !== undefined) {
        result[item.id] = item.base + (i < leftover ? 1 : 0);
      }
    }
    return result;
  }

  return {};
}
