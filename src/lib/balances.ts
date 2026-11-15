import type { Account, Transaction } from "./types";
import { toCents, fromCents } from "./money";

/** Signed cents delta of a transaction: income adds, expense subtracts. */
function signedCents(t: Pick<Transaction, "type" | "amount">): number {
  const p = toCents(t.amount);
  return t.type === "income" ? p : -p;
}

/** Balance of one account = opening balance + all its transactions.
 * Can be negative (overspend). */
export function accountBalance(
  account: Pick<Account, "id" | "opening_balance">,
  txns: Pick<Transaction, "account_id" | "type" | "amount">[],
): number {
  let cents = toCents(account.opening_balance);
  for (const t of txns) {
    if (t.account_id === account.id) cents += signedCents(t);
  }
  return fromCents(cents);
}

/** Sum of every account's balance. */
export function overallBalance(
  accounts: Pick<Account, "id" | "opening_balance">[],
  txns: Pick<Transaction, "account_id" | "type" | "amount">[],
): number {
  let cents = 0;
  for (const a of accounts) cents += toCents(accountBalance(a, txns));
  return fromCents(cents);
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
    if (t.type === "income") incomeP += toCents(t.amount);
    else expenseP += toCents(t.amount);
  }
  const income = fromCents(incomeP);
  const expense = fromCents(expenseP);
  return { income, expense, net: fromCents(incomeP - expenseP) };
}

/** Total income and expense across all transactions. */
export function totals(
  txns: Pick<Transaction, "type" | "amount">[],
): MonthTotals {
  let incomeP = 0;
  let expenseP = 0;
  for (const t of txns) {
    if (t.type === "income") incomeP += toCents(t.amount);
    else expenseP += toCents(t.amount);
  }
  return {
    income: fromCents(incomeP),
    expense: fromCents(expenseP),
    net: fromCents(incomeP - expenseP),
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
  let cents = 0;
  for (const a of accounts) {
    if (a.opening_date > asOfDate) continue;
    cents += toCents(a.opening_balance);
  }
  for (const t of txns) {
    if (t.date <= asOfDate) cents += signedCents(t);
  }
  return fromCents(cents);
}

/** Balance of one account as of a date (inclusive). */
export function accountBalanceAsOf(
  account: Pick<Account, "id" | "opening_balance" | "opening_date">,
  txns: Pick<Transaction, "account_id" | "type" | "amount" | "date">[],
  asOfDate: string,
): number {
  if (account.opening_date > asOfDate) return 0;
  let cents = toCents(account.opening_balance);
  for (const t of txns) {
    if (t.account_id === account.id && t.date <= asOfDate) {
      cents += signedCents(t);
    }
  }
  return fromCents(cents);
}

/**
 * Excel-style running overall balance through ordered rows.
 * `startCents` is the overall balance *before* the first row.
 */
export function runningOverallBalances(
  startCents: number,
  txns: Pick<Transaction, "type" | "amount">[],
): number[] {
  let cents = startCents;
  return txns.map((t) => {
    cents += signedCents(t);
    return fromCents(cents);
  });
}

/** Opening overall for YYYY-MM (Excel summary cell next to income/expense). */
export function monthOpeningOverall(
  accounts: Pick<Account, "opening_balance" | "opening_date">[],
  txns: Pick<Transaction, "date" | "type" | "amount">[],
  ym: string,
): number {
  const monthStart = `${ym}-01`;
  let cents = 0;
  for (const a of accounts) {
    if (a.opening_date <= monthStart) cents += toCents(a.opening_balance);
  }
  for (const t of txns) {
    if (t.date < monthStart) cents += signedCents(t);
  }
  return fromCents(cents);
}

/**
 * Excel month figures:
 * Total balance (yellow) = sum(starting balances of all accounts) + income − expense
 *
 * Prefers values captured from the Google Sheet (Beginning Balance rows + footer).
 * Falls back to reconstructing from openings + prior transactions.
 */
export function excelMonthSummary(
  accounts: Pick<Account, "opening_balance" | "opening_date">[],
  txns: Pick<Transaction, "date" | "type" | "amount">[],
  ym: string,
  sheet?: { opening: number; income: number; expense: number; closing: number } | null,
): { opening: number; income: number; expense: number; closing: number; source: "excel" | "computed" } {
  const [y, m] = ym.split("-").map(Number);
  const computed = monthTotals(txns, y, m);

  if (sheet && (sheet.opening || sheet.income || sheet.expense)) {
    // Prefer live income/expense from DB when present; opening always from Excel begins.
    const income = computed.income || sheet.income;
    const expense = computed.expense || sheet.expense;
    const opening = sheet.opening;
    const closing = fromCents(toCents(opening) + toCents(income) - toCents(expense));
    return { opening, income, expense, closing, source: "excel" };
  }

  const opening = monthOpeningOverall(accounts, txns, ym);
  const closing = fromCents(
    toCents(opening) + toCents(computed.income) - toCents(computed.expense),
  );
  return {
    opening,
    income: computed.income,
    expense: computed.expense,
    closing,
    source: "computed",
  };
}
