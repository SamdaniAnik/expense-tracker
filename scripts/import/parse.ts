import { guessCategory } from "../../src/lib/categories";
import type { AccountType } from "../../src/lib/types";

export type RawKind = "in" | "out" | "begin";

export interface RawRow {
  account: string;
  date: string; // ISO preferred (YYYY-MM-DD); d/m/yyyy or m/d/yyyy also accepted
  desc: string;
  amount?: number | string | null;
  kind: RawKind;
}

export interface ParsedAccount {
  key: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  opening_date: string;
}

export interface ParsedTx {
  accountKey: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
}

export interface ParseResult {
  accounts: ParsedAccount[];
  transactions: ParsedTx[];
  skipped: { row: RawRow; reason: string }[];
}

const ACCOUNTS: { match: RegExp; key: string; name: string; type: AccountType }[] = [
  { match: /standard chartered|scb/i, key: "SCB", name: "Standard Chartered Bank", type: "bank" },
  { match: /bkash/i, key: "BKASH", name: "bKash", type: "mobile" },
  { match: /nagad/i, key: "NAGAD", name: "Nagad", type: "mobile" },
  { match: /cash/i, key: "CASH", name: "Cash in hand", type: "cash" },
];

export function resolveAccount(raw: string) {
  const s = (raw ?? "").trim();
  return ACCOUNTS.find((a) => a.match.test(s)) ?? null;
}

export function parseMoney(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const cleaned = v.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return NaN;
  return Number(cleaned);
}

/** Normalise a date to ISO YYYY-MM-DD. Accepts ISO, or d/m/yyyy / m/d/yyyy
 * (disambiguated by the >12 rule; ambiguous values assume month-first). */
export function normalizeDate(s: string): string | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let [, aStr, bStr, yStr] = slash;
    let a = Number(aStr);
    let b = Number(bStr);
    let year = Number(yStr);
    if (year < 100) year += 2000;
    let day: number, month: number;
    if (a > 12) {
      day = a; month = b;
    } else if (b > 12) {
      month = a; day = b;
    } else {
      month = a; day = b; // ambiguous -> month first
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

export function parseRows(rows: RawRow[]): ParseResult {
  const accounts = new Map<string, ParsedAccount>();
  const transactions: ParsedTx[] = [];
  const skipped: { row: RawRow; reason: string }[] = [];

  for (const row of rows) {
    const acc = resolveAccount(row.account);
    if (!acc) {
      skipped.push({ row, reason: "unknown account" });
      continue;
    }
    const date = normalizeDate(row.date);
    if (!date) {
      skipped.push({ row, reason: "bad date" });
      continue;
    }

    if (row.kind === "begin") {
      // first beginning balance per account sets the opening balance
      if (!accounts.has(acc.key)) {
        const bal = parseMoney(row.amount);
        accounts.set(acc.key, {
          key: acc.key,
          name: acc.name,
          type: acc.type,
          opening_balance: Number.isFinite(bal) ? bal : 0,
          opening_date: date,
        });
      }
      continue; // never a transaction
    }

    const amount = parseMoney(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped.push({ row, reason: "no valid amount" });
      continue;
    }

    // ensure the account exists even if it never had a "begin" row
    if (!accounts.has(acc.key)) {
      accounts.set(acc.key, {
        key: acc.key,
        name: acc.name,
        type: acc.type,
        opening_balance: 0,
        opening_date: date,
      });
    }

    transactions.push({
      accountKey: acc.key,
      date,
      type: row.kind === "in" ? "income" : "expense",
      amount,
      description: row.desc?.trim() ?? "",
      category: guessCategory(row.desc ?? ""),
    });
  }

  return { accounts: [...accounts.values()], transactions, skipped };
}
