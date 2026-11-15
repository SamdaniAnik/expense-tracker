import { getAccounts } from "@/lib/data";
import { getRecurringRules } from "@/lib/recurring";
import { formatBDT } from "@/lib/money";
import { Empty, SectionTitle } from "@/components/ui";
import { createRecurring, deleteRecurring, toggleRecurring, runRecurringNow } from "./actions";
import RunRecurringButton from "@/components/RunRecurringButton";

export default async function RecurringPage() {
  const [accounts, rules] = await Promise.all([getAccounts(), getRecurringRules()]);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const nameById = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Recurring</h1>
          <p className="text-sm text-[var(--muted)]">
            Auto-post salary, rent, bills on a day each month
          </p>
        </div>
        <RunRecurringButton action={runRecurringNow} />
      </div>

      {rules.length === 0 ? (
        <Empty>No recurring rules yet.</Empty>
      ) : (
        <div className="mb-6 space-y-2.5">
          {rules.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {r.description || r.category || "Recurring"}{" "}
                  <span
                    className="text-xs font-bold"
                    style={{ color: r.type === "income" ? "var(--income)" : "var(--expense)" }}
                  >
                    {r.type}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatBDT(Number(r.amount))} · day {r.day_of_month} ·{" "}
                  {nameById.get(r.account_id) ?? "—"}
                  {r.last_applied ? ` · last ${r.last_applied}` : ""}
                  {!r.active ? " · paused" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={toggleRecurring}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={r.active ? "false" : "true"} />
                  <button type="submit" className="btn btn-ghost text-xs">
                    {r.active ? "Pause" : "Resume"}
                  </button>
                </form>
                <form action={deleteRecurring}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs font-semibold text-[var(--expense)]">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>New rule</SectionTitle>
      <form action={createRecurring} className="card space-y-3 p-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select name="type" className="input" defaultValue="expense">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label className="label">Day of month (1–28)</label>
            <input
              name="day_of_month"
              type="number"
              min={1}
              max={28}
              defaultValue={1}
              className="input"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Amount (৳)</label>
          <input name="amount" inputMode="decimal" className="input" required />
        </div>
        <div>
          <label className="label">Account</label>
          <select name="account_id" className="input" required defaultValue={activeAccounts[0]?.id}>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <input name="description" className="input" placeholder="e.g. Rent" />
        </div>
        <div>
          <label className="label">Category</label>
          <input name="category" className="input" placeholder="e.g. Bills" />
        </div>
        <button className="btn btn-primary w-full" disabled={activeAccounts.length === 0}>
          Add recurring
        </button>
      </form>
    </div>
  );
}
