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

/** Day before YYYY-MM-01, as ISO date. */
export function dayBeforeMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 0)); // day 0 of this month = last day of prev
  return d.toISOString().slice(0, 10);
}

/** Last day of YYYY-MM. */
export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}

/** Overall balance using openings started by `asOfDate` + txns on/before it. */
export function overallBalanceAsOf(
  accounts: Pick<Account, "id" | "opening_balance" | "opening_date">[],
  txns: Pick<Transaction, "account_id" | "type" | "amount" | "date">[],
  asOfDate: string,
): number {
  let paisa = 0;
  for (const a of accounts) {
    if (a.opening_date > asOfDate) continue;
    paisa += toPaisa(a.opening_balance);
  }
  for (const t of txns) {
    if (t.date <= asOfDate) paisa += signedPaisa(t);
  }
  return fromPaisa(paisa);
}

/** Balance of one account as of a date (inclusive). */
export function accountBalanceAsOf(
  account: Pick<Account, "id" | "opening_balance" | "opening_date">,
  txns: Pick<Transaction, "account_id" | "type" | "amount" | "date">[],
  asOfDate: string,
): number {
  if (account.opening_date > asOfDate) return 0;
  let paisa = toPaisa(account.opening_balance);
  for (const t of txns) {
    if (t.account_id === account.id && t.date <= asOfDate) {
      paisa += signedPaisa(t);
    }
  }
  return fromPaisa(paisa);
}

/**
 * Excel-style running overall balance through ordered rows.
 * `startPaisa` is the overall balance *before* the first row.
 */
export function runningOverallBalances(
  startPaisa: number,
  txns: Pick<Transaction, "type" | "amount">[],
): number[] {
  let paisa = startPaisa;
  return txns.map((t) => {
    paisa += signedPaisa(t);
    return fromPaisa(paisa);
  });
}

/** Opening overall for YYYY-MM (Excel summary cell next to income/expense). */
export function monthOpeningOverall(
  accounts: Pick<Account, "opening_balance" | "opening_date">[],
  txns: Pick<Transaction, "date" | "type" | "amount">[],
  ym: string,
): number {
  const monthStart = `${ym}-01`;
  let paisa = 0;
  for (const a of accounts) {
    if (a.opening_date <= monthStart) paisa += toPaisa(a.opening_balance);
  }
  for (const t of txns) {
    if (t.date < monthStart) paisa += signedPaisa(t);
  }
  return fromPaisa(paisa);
}

/**
 * Excel month footer figures:
 * - opening (sum of beginning balances / prior activity)
 * - income / expense for the month (green / pink)
 * - closing (yellow) = opening + income − expense
 */
export function excelMonthSummary(
  accounts: Pick<Account, "opening_balance" | "opening_date">[],
  txns: Pick<Transaction, "date" | "type" | "amount">[],
  ym: string,
): { opening: number; income: number; expense: number; closing: number } {
  const [y, m] = ym.split("-").map(Number);
  const { income, expense } = monthTotals(txns, y, m);
  const opening = monthOpeningOverall(accounts, txns, ym);
  const closing = fromPaisa(toPaisa(opening) + toPaisa(income) - toPaisa(expense));
  return { opening, income, expense, closing };
}
