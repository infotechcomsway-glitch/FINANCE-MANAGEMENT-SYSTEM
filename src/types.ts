export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  isPaid: boolean;
}

export interface Investment {
  id: string;
  assetName: string;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  category: 'Stock' | 'Crypto' | 'Real Estate' | 'Other';
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Food & Dining', icon: 'Utensils', color: '#EF4444', type: 'expense' },
  { id: '2', name: 'Shopping', icon: 'ShoppingBag', color: '#F59E0B', type: 'expense' },
  { id: '3', name: 'Transportation', icon: 'Car', color: '#10B981', type: 'expense' },
  { id: '4', name: 'Entertainment', icon: 'Film', color: '#8B5CF6', type: 'expense' },
  { id: '5', name: 'Health', icon: 'HeartPulse', color: '#EC4899', type: 'expense' },
  { id: '6', name: 'Utilities', icon: 'Zap', color: '#3B82F6', type: 'expense' },
  { id: '7', name: 'Salary', icon: 'Wallet', color: '#10B981', type: 'income' },
  { id: '8', name: 'Investment', icon: 'TrendingUp', color: '#6366F1', type: 'income' },
  { id: '9', name: 'Other', icon: 'MoreHorizontal', color: '#6B7280', type: 'expense' },
];
