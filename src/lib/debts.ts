import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Debt } from "@/lib/types";

export const getDebts = cache(async (includeSettled = false): Promise<Debt[]> => {
  try {
    const supabase = await createClient();
    let q = supabase.from("debts").select("*").order("due_date", { ascending: true });
    if (!includeSettled) q = q.eq("settled", false);
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []) as Debt[];
  } catch {
    return [];
  }
});

export function debtTotals(debts: Debt[]) {
  let owe = 0;
  let lent = 0;
  for (const d of debts) {
    if (d.settled) continue;
    if (d.kind === "owe") owe += Number(d.remaining);
    else lent += Number(d.remaining);
  }
  return { owe, lent, net: lent - owe };
}
