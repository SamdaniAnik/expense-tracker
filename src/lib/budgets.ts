import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toPaisa, fromPaisa } from "@/lib/money";
import type { Budget, Transaction } from "@/lib/types";

export const getBudgets = cache(async (): Promise<Budget[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .order("category", { ascending: true });
    if (error) return [];
    return (data ?? []) as Budget[];
  } catch {
    return [];
  }
});

/** Budgets that apply to a given YYYY-MM. */
export function budgetsForMonth(budgets: Budget[], ym: string): Budget[] {
  const specific = budgets.filter((b) => b.month === ym);
  const recurring = budgets.filter((b) => !b.month || b.month === "");
  const overridden = new Set(specific.map((b) => b.category.toLowerCase()));
  return [
    ...specific,
    ...recurring.filter((b) => !overridden.has(b.category.toLowerCase())),
  ];
}

export function spentByCategory(txns: Transaction[], category: string): number {
  const key = category.toLowerCase();
  let p = 0;
  for (const t of txns) {
    if (t.type !== "expense") continue;
    if (t.is_transfer) continue;
    if ((t.category || "").toLowerCase() !== key) continue;
    p += toPaisa(Number(t.amount));
  }
  return fromPaisa(p);
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  pct: number;
}

export function budgetProgress(
  budgets: Budget[],
  monthTxns: Transaction[],
  ym: string,
): BudgetProgress[] {
  return budgetsForMonth(budgets, ym).map((budget) => {
    const spent = spentByCategory(monthTxns, budget.category);
    const remaining = Number(budget.amount) - spent;
    const pct =
      Number(budget.amount) > 0
        ? Math.min(100, Math.round((spent / Number(budget.amount)) * 1000) / 10)
        : 0;
    return { budget, spent, remaining, pct };
  });
}
