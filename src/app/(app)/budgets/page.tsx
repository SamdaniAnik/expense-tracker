import Link from "next/link";
import { getBudgets, budgetProgress } from "@/lib/budgets";
import { getTransactions } from "@/lib/data";
import { formatBDT } from "@/lib/money";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { Empty, SectionTitle } from "@/components/ui";
import { deleteBudget, upsertBudget } from "./actions";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const ym =
    sp.m && /^\d{4}-\d{2}$/.test(sp.m)
      ? sp.m
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [budgets, monthTxns] = await Promise.all([
    getBudgets(),
    getTransactions({ month: ym, lean: true }),
  ]);
  const progress = budgetProgress(budgets, monthTxns, ym);
  const label = new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Budgets</h1>
          <p className="text-sm text-[var(--muted)]">Category spending limits · {label}</p>
        </div>
        <input
          type="month"
          defaultValue={ym}
          className="input w-auto"
          form="budget-month"
          name="m"
          // clientless month jump via form get
        />
      </div>

      <form id="budget-month" className="mb-4">
        <noscript>
          <button className="btn btn-ghost text-sm">Go</button>
        </noscript>
      </form>
      {/* month picker as links for reliability without client JS */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[-1, 0, 1].map((delta) => {
          const [y, m] = ym.split("-").map(Number);
          const d = new Date(y, m - 1 + delta, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const text = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
          return (
            <Link
              key={key}
              href={`/budgets?m=${key}`}
              className="rounded-lg px-3 py-1.5 text-xs font-bold"
              style={{
                background: key === ym ? "var(--primary)" : "var(--surface-2)",
                color: key === ym ? "var(--primary-ink)" : "var(--text)",
              }}
            >
              {text}
            </Link>
          );
        })}
      </div>

      {progress.length === 0 ? (
        <Empty>No budgets yet. Add a category limit below.</Empty>
      ) : (
        <div className="mb-6 space-y-3">
          {progress.map(({ budget, spent, remaining, pct }) => {
            const over = remaining < 0;
            return (
              <div key={budget.id} className="card p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{budget.category}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {budget.month ? `Only ${budget.month}` : "Every month"} · limit{" "}
                      {formatBDT(Number(budget.amount))}
                    </p>
                  </div>
                  <form action={deleteBudget}>
                    <input type="hidden" name="id" value={budget.id} />
                    <button type="submit" className="text-xs font-semibold text-[var(--expense)]">
                      Remove
                    </button>
                  </form>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: over ? "var(--expense)" : "var(--primary)",
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs tabular-nums">
                  <span style={{ color: over ? "var(--expense)" : "var(--text)" }}>
                    Spent {formatBDT(spent)} ({pct}%)
                  </span>
                  <span className="text-[var(--muted)]">
                    {over ? "Over by " : "Left "}
                    {formatBDT(Math.abs(remaining))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SectionTitle>Add / update budget</SectionTitle>
      <form action={upsertBudget} className="card space-y-3 p-4 sm:max-w-lg">
        <div>
          <label className="label">Category</label>
          <input
            name="category"
            list="budget-cats"
            className="input"
            placeholder="e.g. Food"
            required
          />
          <datalist id="budget-cats">
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Limit (৳)</label>
            <input name="amount" inputMode="decimal" className="input" required placeholder="10000" />
          </div>
          <div>
            <label className="label">Month (optional)</label>
            <input name="month" type="month" className="input" defaultValue="" />
            <p className="mt-1 text-[0.65rem] text-[var(--muted)]">Blank = every month</p>
          </div>
        </div>
        <button className="btn btn-primary w-full">Save budget</button>
      </form>
    </div>
  );
}
