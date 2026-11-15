import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { RecurringRule } from "@/lib/types";

export const getRecurringRules = cache(async (): Promise<RecurringRule[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .order("day_of_month", { ascending: true });
  if (error) {
    if (error.message.includes("recurring_rules") || error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []) as RecurringRule[];
});

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function applyDateForMonth(ym: string, day: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = Math.min(day, daysInMonth(y, m));
  return `${ym}-${String(d).padStart(2, "0")}`;
}

/** Create missing transactions for active rules up through today. Returns count created. */
export async function applyDueRecurring(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: rules, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("active", true);
  if (error || !rules?.length) return 0;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let created = 0;

  for (const rule of rules as RecurringRule[]) {
    // Walk months from last_applied (or created month) to current
    let cursor: string;
    if (rule.last_applied) {
      const [y, m] = rule.last_applied.slice(0, 7).split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      cursor = next;
    } else {
      cursor = rule.created_at.slice(0, 7);
    }

    const endYm = todayStr.slice(0, 7);
    while (cursor <= endYm) {
      const date = applyDateForMonth(cursor, rule.day_of_month);
      if (date > todayStr) break;

      // Skip if already posted for this rule+date (idempotent via description marker)
      const marker = `[recurring:${rule.id}]`;
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", date)
        .ilike("note", `%${marker}%`)
        .limit(1);

      if (!existing?.length) {
        const { error: insErr } = await supabase.from("transactions").insert({
          user_id: user.id,
          account_id: rule.account_id,
          date,
          type: rule.type,
          amount: rule.amount,
          description: rule.description,
          category: rule.category,
          note: marker,
        });
        if (!insErr) created += 1;
      }

      await supabase
        .from("recurring_rules")
        .update({ last_applied: date })
        .eq("id", rule.id);

      const [y, m] = cursor.split("-").map(Number);
      cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    }
  }

  return created;
}
