export type AccountType = "bank" | "mobile" | "cash";
export type TxType = "income" | "expense";

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
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: "Bank",
  mobile: "Mobile wallet",
  cash: "Cash",
};
