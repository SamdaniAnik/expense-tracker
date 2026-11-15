import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction } from "./types";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Per-request dedupe. */
export const getAccounts = cache(async (): Promise<Account[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Account[];
});

export interface TxFilter {
  month?: string; // YYYY-MM
  accountId?: string;
  category?: string;
  search?: string;
  limit?: number;
  lean?: boolean;
}

const FULL_COLS =
  "id,user_id,account_id,date,type,amount,description,category,note,tags,receipt_path,transfer_group_id,is_transfer,created_at,updated_at";
const LEAN_COLS =
  "id,account_id,date,type,amount,description,category,note,tags,is_transfer,created_at";

export async function getTransactions(
  filter: TxFilter = {},
): Promise<Transaction[]> {
  const supabase = await createClient();
  const base = filter.lean
    ? supabase.from("transactions").select(LEAN_COLS)
    : supabase.from("transactions").select(FULL_COLS);

  let q = base;
  if (filter.month) {
    const [y, m] = filter.month.split("-").map(Number);
    const start = `${filter.month}-01`;
    const end =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    q = q.gte("date", start).lt("date", end);
  }
  if (filter.accountId) q = q.eq("account_id", filter.accountId);
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.search) {
    const s = filter.search.replace(/[%_,]/g, " ").trim();
    if (s) {
      q = q.or(
        `description.ilike.%${s}%,note.ilike.%${s}%,category.ilike.%${s}%`,
      );
    }
  }

  q = q.order("date", { ascending: false }).order("created_at", { ascending: false });
  if (filter.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error) {
    // Graceful fallback before features.sql migration
    if (
      error.message.includes("tags") ||
      error.message.includes("is_transfer") ||
      error.message.includes("receipt_path") ||
      error.message.includes("note")
    ) {
      const legacy = filter.lean
        ? "id,account_id,date,type,amount,description,category,created_at"
        : "id,user_id,account_id,date,type,amount,description,category,note,created_at,updated_at";
      let q2 = supabase.from("transactions").select(legacy);
      if (filter.month) {
        const [y, m] = filter.month.split("-").map(Number);
        const start = `${filter.month}-01`;
        const end =
          m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
        q2 = q2.gte("date", start).lt("date", end);
      }
      if (filter.accountId) q2 = q2.eq("account_id", filter.accountId);
      if (filter.category) q2 = q2.eq("category", filter.category);
      if (filter.search) q2 = q2.ilike("description", `%${filter.search}%`);
      q2 = q2.order("date", { ascending: false }).order("created_at", { ascending: false });
      if (filter.limit) q2 = q2.limit(filter.limit);
      const res = await q2;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as Transaction[];
    }
    throw error;
  }
  return (data ?? []) as unknown as Transaction[];
}

/** All lean transactions — request-deduped only (cookies cannot go in unstable_cache). */
export const getAllTransactions = cache(async (): Promise<Transaction[]> => {
  const supabase = await createClient();
  const pageSize = 1000;
  const out: Transaction[] = [];
  const cols =
    "id,account_id,date,type,amount,description,category,is_transfer,created_at";
  for (let from = 0; ; from += pageSize) {
    let { data, error } = await supabase
      .from("transactions")
      .select(cols)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error && error.message.includes("is_transfer")) {
      const res = await supabase
        .from("transactions")
        .select("id,account_id,date,type,amount,description,category,created_at")
        .order("date", { ascending: true })
        .range(from, from + pageSize - 1);
      if (res.error) throw res.error;
      const chunk = (res.data ?? []) as unknown as Transaction[];
      out.push(...chunk);
      if (chunk.length < pageSize) break;
      continue;
    }
    if (error) throw error;
    const chunk = (data ?? []) as unknown as Transaction[];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
});

/** Transactions with date in [start, endExclusive). */
export async function getTransactionsInRange(
  startInclusive: string,
  endExclusive: string,
): Promise<Transaction[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const out: Transaction[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id,account_id,date,type,amount,description,category,note,tags,is_transfer,created_at",
      )
      .gte("date", startInclusive)
      .lt("date", endExclusive)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as unknown as Transaction[];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
}

/** Transactions strictly before a date. */
export async function getTransactionsBefore(beforeDate: string): Promise<Transaction[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const out: Transaction[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select("account_id,date,type,amount")
      .lt("date", beforeDate)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as unknown as Transaction[];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Transaction) ?? null;
}

export async function getUsedCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("category")
    .not("category", "is", null)
    .limit(3000);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { category: string | null }).category;
    if (c) set.add(c);
  }
  return [...set].sort();
}

export async function getTransactionCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
