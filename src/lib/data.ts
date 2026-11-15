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
    .select("id,user_id,name,type,currency,opening_balance,opening_date,sort_order,archived")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    // Surface a clear message (often RLS misconfigured after features.sql)
    throw new Error(error.message || "Failed to load accounts");
  }
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

/** Columns that exist before features.sql — never crash production. */
const BASE_LEAN =
  "id,account_id,date,type,amount,description,category,note,created_at";
const BASE_FULL =
  "id,user_id,account_id,date,type,amount,description,category,note,created_at,updated_at";

function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  filter: TxFilter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
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
      q = q.or(`description.ilike.%${s}%,note.ilike.%${s}%,category.ilike.%${s}%`);
    }
  }
  q = q.order("date", { ascending: false }).order("created_at", { ascending: false });
  if (filter.limit) q = q.limit(filter.limit);
  return q;
}

export async function getTransactions(
  filter: TxFilter = {},
): Promise<Transaction[]> {
  const supabase = await createClient();

  // Prefer extended columns when features.sql has been applied.
  const extended = filter.lean
    ? "id,account_id,date,type,amount,description,category,note,tags,is_transfer,receipt_path,created_at"
    : "id,user_id,account_id,date,type,amount,description,category,note,tags,receipt_path,transfer_group_id,is_transfer,created_at,updated_at";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;
  let q = applyFilters(sb.from("transactions").select(extended), filter);
  let { data, error } = await q;

  if (error) {
    // Schema not migrated yet — fall back to base columns.
    const q2 = applyFilters(
      sb.from("transactions").select(filter.lean ? BASE_LEAN : BASE_FULL),
      filter,
    );
    const res = await q2;
    if (res.error && filter.search) {
      // Last resort: description-only search
      let q3 = applyFilters(
        sb.from("transactions").select(filter.lean ? BASE_LEAN : BASE_FULL),
        { ...filter, search: undefined },
      );
      q3 = q3.ilike("description", `%${filter.search}%`);
      const res3 = await q3;
      if (res3.error) throw res3.error;
      return (res3.data ?? []) as unknown as Transaction[];
    }
    if (res.error) throw res.error;
    data = res.data;
  }

  return (data ?? []) as unknown as Transaction[];
}

/** All lean transactions — request-deduped only. */
export const getAllTransactions = cache(async (): Promise<Transaction[]> => {
  const supabase = await createClient();
  const pageSize = 1000;
  const out: Transaction[] = [];
  let useExtended = true;

  for (let from = 0; ; from += pageSize) {
    const cols = useExtended
      ? "id,account_id,date,type,amount,description,category,note,is_transfer,created_at"
      : "id,account_id,date,type,amount,description,category,note,created_at";
    const { data, error } = await supabase
      .from("transactions")
      .select(cols)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error && useExtended) {
      useExtended = false;
      from -= pageSize;
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
  let useExtended = true;

  for (let from = 0; ; from += pageSize) {
    const cols = useExtended
      ? "id,account_id,date,type,amount,description,category,note,tags,is_transfer,created_at"
      : BASE_LEAN;
    const { data, error } = await supabase
      .from("transactions")
      .select(cols)
      .gte("date", startInclusive)
      .lt("date", endExclusive)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error && useExtended) {
      useExtended = false;
      from -= pageSize;
      continue;
    }
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
  let { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const res = await supabase
      .from("transactions")
      .select(BASE_FULL)
      .eq("id", id)
      .maybeSingle();
    if (res.error) throw res.error;
    data = res.data;
  }
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
