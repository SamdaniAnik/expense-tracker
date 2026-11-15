export type AccountType = "bank" | "mobile" | "cash";
export type TxType = "income" | "expense";
export type DebtKind = "owe" | "lent";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  opening_date: string; // YYYY-MM-DD
  sort_order: number;
  archived: boolean;
  household_id?: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  type: TxType;
  amount: number; // always positive
  description: string;
  category: string | null;
  note: string | null;
  tags?: string[];
  receipt_path?: string | null;
  transfer_group_id?: string | null;
  is_transfer?: boolean;
  household_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionInput {
  account_id: string;
  date: string;
  type: TxType;
  amount: number;
  description: string;
  category?: string | null;
  note?: string | null;
  tags?: string[];
  receipt_path?: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string | null;
  created_at: string;
}

export interface RecurringRule {
  id: string;
  user_id: string;
  account_id: string;
  type: TxType;
  amount: number;
  description: string;
  category: string | null;
  day_of_month: number;
  active: boolean;
  last_applied: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  kind: DebtKind;
  name: string;
  counterparty: string;
  principal: number;
  remaining: number;
  due_date: string | null;
  note: string | null;
  settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: "Bank",
  mobile: "Mobile wallet",
  cash: "Cash",
};

export const DEBT_KIND_LABEL: Record<DebtKind, string> = {
  owe: "I owe",
  lent: "They owe me",
};
