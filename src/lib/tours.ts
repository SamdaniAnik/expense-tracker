import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toPaisa, fromPaisa } from "@/lib/money";

export interface TourGroup {
  id: string;
  name: string;
  description: string;
  base_currency: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface TourMember {
  id: string;
  group_id: string;
  user_id: string | null;
  guest_name: string | null;
  role: "owner" | "member";
  joined_at: string;
}

export interface TourExpense {
  id: string;
  group_id: string;
  paid_by: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  split_type: "equal" | "exact";
  created_by: string;
  created_at: string;
}

export interface TourShare {
  id: string;
  expense_id: string;
  member_id: string;
  owed_amount: number;
}

export interface TourSettlement {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  currency: string;
  note: string | null;
  date: string;
  created_by: string;
  created_at: string;
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function memberLabel(m: TourMember, emailByUser?: Map<string, string>) {
  if (m.guest_name) return m.guest_name;
  if (m.user_id && emailByUser?.get(m.user_id)) return emailByUser.get(m.user_id)!;
  return m.user_id ? "Member" : "Guest";
}

export const getMyTourGroups = cache(async (): Promise<TourGroup[]> => {
  try {
    const supabase = await createClient();
    const { data: memberships, error } = await supabase
      .from("tour_members")
      .select("group_id");
    if (error || !memberships?.length) return [];
    const ids = [...new Set(memberships.map((m) => m.group_id as string))];
    const { data: groups } = await supabase
      .from("tour_groups")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return (groups ?? []) as TourGroup[];
  } catch {
    return [];
  }
});

export async function getTourGroup(id: string): Promise<TourGroup | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("tour_groups").select("*").eq("id", id).maybeSingle();
  return (data as TourGroup) ?? null;
}

export async function getTourMembers(groupId: string): Promise<TourMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tour_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  return (data ?? []) as TourMember[];
}

export async function getTourExpenses(groupId: string): Promise<TourExpense[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tour_expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as TourExpense[];
}

export async function getTourShares(expenseIds: string[]): Promise<TourShare[]> {
  if (!expenseIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("tour_shares").select("*").in("expense_id", expenseIds);
  return (data ?? []) as TourShare[];
}

export async function getTourSettlements(groupId: string): Promise<TourSettlement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tour_settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false });
  return (data ?? []) as TourSettlement[];
}

/** Net balance per member in group base currency units (positive = others owe them). */
export function computeBalances(
  members: TourMember[],
  expenses: TourExpense[],
  shares: TourShare[],
  settlements: TourSettlement[],
): Map<string, number> {
  const bal = new Map<string, number>();
  for (const m of members) bal.set(m.id, 0);

  const sharesByExpense = new Map<string, TourShare[]>();
  for (const s of shares) {
    const list = sharesByExpense.get(s.expense_id) ?? [];
    list.push(s);
    sharesByExpense.set(s.expense_id, list);
  }

  for (const e of expenses) {
    const paid = toPaisa(Number(e.amount));
    bal.set(e.paid_by, (bal.get(e.paid_by) ?? 0) + paid);
    for (const s of sharesByExpense.get(e.id) ?? []) {
      bal.set(s.member_id, (bal.get(s.member_id) ?? 0) - toPaisa(Number(s.owed_amount)));
    }
  }

  for (const s of settlements) {
    const amt = toPaisa(Number(s.amount));
    // from pays to → from's debt decreases (balance up), to's credit decreases (balance down)
    bal.set(s.from_member, (bal.get(s.from_member) ?? 0) + amt);
    bal.set(s.to_member, (bal.get(s.to_member) ?? 0) - amt);
  }

  const out = new Map<string, number>();
  for (const [id, p] of bal) out.set(id, fromPaisa(p));
  return out;
}

/** Suggest pairwise settlements from net balances (greedy). */
export function suggestSettlements(
  balances: Map<string, number>,
): { from: string; to: string; amount: number }[] {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  for (const [id, amt] of balances) {
    if (amt < -0.009) debtors.push({ id, amt: -amt });
    else if (amt > 0.009) creditors.push({ id, amt });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const suggestions: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    const amount = Math.round(pay * 100) / 100;
    if (amount > 0) {
      suggestions.push({ from: debtors[i].id, to: creditors[j].id, amount });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i += 1;
    if (creditors[j].amt < 0.01) j += 1;
  }
  return suggestions;
}
