export interface Member {
  id: string;
  name: string;
}

export type Category = 'Food' | 'Travel' | 'Stay' | 'Activities' | 'Other';

export interface EqualSplit {
  type: 'equal';
  memberIds: string[];
}

export interface ExactSplit {
  type: 'exact';
  shares: Record<string, number>;
}

export interface PercentSplit {
  type: 'percent';
  shares: Record<string, number>;
}

export type Split = EqualSplit | ExactSplit | PercentSplit;

export interface Expense {
  id: string;
  description: string;
  amount: number; // integer in paise
  paidBy: string;
  date: string;
  category: Category;
  split: Split;
}

export interface AppState {
  members: Member[];
  expenses: Expense[];
}

