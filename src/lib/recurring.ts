import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { RecurringRule } from "@/lib/types";

export const getRecurringRules = cache(async (): Promise<RecurringRule[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .order("day_of_month", { ascending: true });
    if (error) return [];
    return (data ?? []) as RecurringRule[];
  } catch {
    return [];
  }
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
  try {
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
      let cursor: string;
      if (rule.last_applied) {
        const [y, m] = rule.last_applied.slice(0, 7).split("-").map(Number);
        cursor =
          m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      } else {
        cursor = (rule.created_at || todayStr).slice(0, 7);
      }

      const endYm = todayStr.slice(0, 7);
      // Safety: don't walk more than 36 months
      let steps = 0;
      while (cursor <= endYm && steps < 36) {
        steps += 1;
        const date = applyDateForMonth(cursor, rule.day_of_month);
        if (date > todayStr) break;

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
  } catch {
    return 0;
  }
}
