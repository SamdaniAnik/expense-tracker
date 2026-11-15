import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction } from "./types";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Account[];
}

export interface TxFilter {
  month?: string; // YYYY-MM
  accountId?: string;
  category?: string;
  search?: string;
  limit?: number;
}

export async function getTransactions(
  filter: TxFilter = {},
): Promise<Transaction[]> {
  const supabase = await createClient();
  let q = supabase.from("transactions").select("*");

  if (filter.month) {
    const [y, m] = filter.month.split("-").map(Number);
    const start = `${filter.month}-01`;
    const end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    q = q.gte("date", start).lt("date", end);
  }
  if (filter.accountId) q = q.eq("account_id", filter.accountId);
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.search) q = q.ilike("description", `%${filter.search}%`);

  q = q.order("date", { ascending: false }).order("created_at", { ascending: false });
  if (filter.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

/** All transactions, used for whole-period computations (balances, charts).
 * Paginates past Supabase's default 1000-row cap. */
export async function getAllTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const out: Transaction[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id,user_id,account_id,date,type,amount,description,category,note,created_at,updated_at",
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Transaction[];
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

/** Distinct categories the user has actually used, for suggestions. */
export async function getUsedCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("category")
    .not("category", "is", null)
    .limit(2000);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { category: string | null }).category;
    if (c) set.add(c);
  }
  return [...set].sort();
}
