export type TxType = 'exp' | 'inc' | 'xfr';
export type Freq = 'monthly' | 'weekly' | 'yearly';

export interface TxRecord {
  id: string;
  date: string;
  type: TxType;
  acct_id: string | null;
  acct2_id: string | null;
  cat: string;
  note: string;
  payer: string;
  amount: number;
  currency: string;
  twd: number;
  user_id: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  init: number;
}

export interface FixedItem {
  id: string;
  user_id: string;
  name: string;
  type: 'exp' | 'inc';
  cat: string;
  amount: number;
  currency: string;
  freq: Freq;
  next_date: string;
}

export interface ShareItem {
  id: string;
  user_id: string;
  date: string;
  note: string;
  amount: number;
  payers: Record<string, number>;
  members: string[];
}

export type Budgets = Record<string, number>;
