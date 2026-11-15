import type { Account, Transaction } from "./types";
import { toPaisa, fromPaisa } from "./money";

/** Signed paisa delta of a transaction: income adds, expense subtracts. */
function signedPaisa(t: Pick<Transaction, "type" | "amount">): number {
  const p = toPaisa(t.amount);
  return t.type === "income" ? p : -p;
}

/** Balance of one account = opening balance + all its transactions.
 * Can be negative (overspend). */
export function accountBalance(
  account: Pick<Account, "id" | "opening_balance">,
  txns: Pick<Transaction, "account_id" | "type" | "amount">[],
): number {
  let paisa = toPaisa(account.opening_balance);
  for (const t of txns) {
    if (t.account_id === account.id) paisa += signedPaisa(t);
  }
  return fromPaisa(paisa);
}

/** Sum of every account's balance. */
export function overallBalance(
  accounts: Pick<Account, "id" | "opening_balance">[],
  txns: Pick<Transaction, "account_id" | "type" | "amount">[],
): number {
  let paisa = 0;
  for (const a of accounts) paisa += toPaisa(accountBalance(a, txns));
  return fromPaisa(paisa);
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

/** Income, expense and net for a given year + month (month is 1-12). */
export function monthTotals(
  txns: Pick<Transaction, "date" | "type" | "amount">[],
  year: number,
  month: number,
): MonthTotals {
  let incomeP = 0;
  let expenseP = 0;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  for (const t of txns) {
    if (!t.date.startsWith(prefix)) continue;
    if (t.type === "income") incomeP += toPaisa(t.amount);
    else expenseP += toPaisa(t.amount);
  }
  const income = fromPaisa(incomeP);
  const expense = fromPaisa(expenseP);
  return { income, expense, net: fromPaisa(incomeP - expenseP) };
}

/** Total income and expense across all transactions. */
export function totals(
  txns: Pick<Transaction, "type" | "amount">[],
): MonthTotals {
  let incomeP = 0;
  let expenseP = 0;
  for (const t of txns) {
    if (t.type === "income") incomeP += toPaisa(t.amount);
    else expenseP += toPaisa(t.amount);
  }
  return {
    income: fromPaisa(incomeP),
    expense: fromPaisa(expenseP),
    net: fromPaisa(incomeP - expenseP),
  };
}
