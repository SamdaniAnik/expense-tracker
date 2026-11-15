import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTourGroup,
  getTourMembers,
  getTourExpenses,
  getTourShares,
  getTourSettlements,
  computeBalances,
  suggestSettlements,
  memberLabel,
} from "@/lib/tours";
import { formatMoney } from "@/lib/fx";
import { Empty, SectionTitle } from "@/components/ui";
import {
  addGuest,
  addSettlement,
  addTourExpense,
  deleteTourExpense,
} from "../actions";

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = await getTourGroup(id);
  if (!group) notFound();

  const [members, expenses, settlements] = await Promise.all([
    getTourMembers(id),
    getTourExpenses(id),
    getTourSettlements(id),
  ]);
  const shares = await getTourShares(expenses.map((e) => e.id));
  const balances = computeBalances(members, expenses, shares, settlements);
  const suggestions = suggestSettlements(balances);
  const label = (mId: string) => {
    const m = members.find((x) => x.id === mId);
    return m ? memberLabel(m) : "—";
  };
  const today = new Date().toISOString().slice(0, 10);
  const currency = group.base_currency;

  return (
    <div>
      <Link href="/tours" className="text-xs font-semibold text-[var(--primary)]">
        ← All tours
      </Link>
      <div className="mb-5 mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{group.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {group.description || "Group expenses"} · base {currency}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-center">
          <p className="text-[0.65rem] font-semibold uppercase text-[var(--muted)]">Invite code</p>
          <p className="font-mono text-lg font-extrabold tracking-widest">{group.invite_code}</p>
        </div>
      </div>

      <SectionTitle>Balances</SectionTitle>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {members.map((m) => {
          const bal = balances.get(m.id) ?? 0;
          return (
            <div key={m.id} className="card flex items-center justify-between p-3.5">
              <span className="font-semibold">{memberLabel(m)}</span>
              <span
                className="tabular-nums font-bold"
                style={{
                  color: bal > 0.009 ? "var(--income)" : bal < -0.009 ? "var(--expense)" : "var(--muted)",
                }}
              >
                {bal > 0.009 ? "gets " : bal < -0.009 ? "owes " : "settled "}
                {formatMoney(Math.abs(bal), currency)}
              </span>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 ? (
        <div className="card mb-6 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Suggested settle-up
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {suggestions.map((s, i) => (
              <li key={i}>
                <strong>{label(s.from)}</strong> pays <strong>{label(s.to)}</strong>{" "}
                {formatMoney(s.amount, currency)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SectionTitle>Expenses</SectionTitle>
      {expenses.length === 0 ? (
        <Empty>No expenses yet.</Empty>
      ) : (
        <div className="card mb-6 divide-y divide-[var(--border)] overflow-hidden">
          {expenses.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-semibold">{e.description}</p>
                <p className="text-xs text-[var(--muted)]">
                  {e.date} · paid by {label(e.paid_by)} · {e.split_type}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold tabular-nums">{formatMoney(Number(e.amount), e.currency)}</span>
                <form action={deleteTourExpense}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="group_id" value={id} />
                  <button type="submit" className="text-xs font-semibold text-[var(--expense)]">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={addTourExpense} className="card space-y-3 p-4">
          <p className="text-sm font-bold">Add expense</p>
          <input type="hidden" name="group_id" value={id} />
          <input name="description" className="input" placeholder="What for?" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="amount" inputMode="decimal" className="input" placeholder="Amount" required />
            <input name="currency" className="input" defaultValue={currency} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="date" type="date" className="input" defaultValue={today} />
            <select name="paid_by" className="input" required defaultValue={members[0]?.id}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {memberLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <select name="split_type" className="input" defaultValue="equal">
            <option value="equal">Split equally</option>
            <option value="exact">Exact amounts (use fields below)</option>
          </select>
          <div className="space-y-2 rounded-xl bg-[var(--surface-2)] p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">
              Include members (exact amounts optional)
            </p>
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="member_id" value={m.id} defaultChecked />
                <span className="flex-1">{memberLabel(m)}</span>
                <input
                  name="exact_amount"
                  inputMode="decimal"
                  className="input !w-24 py-1.5 text-sm"
                  placeholder="0"
                />
              </label>
            ))}
          </div>
          <button className="btn btn-primary w-full">Add expense</button>
        </form>

        <div className="space-y-4">
          <form action={addSettlement} className="card space-y-3 p-4">
            <p className="text-sm font-bold">Record settlement</p>
            <input type="hidden" name="group_id" value={id} />
            <select name="from_member" className="input" required>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {memberLabel(m)} paid
                </option>
              ))}
            </select>
            <select name="to_member" className="input" required>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  to {memberLabel(m)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="amount" inputMode="decimal" className="input" placeholder="Amount" required />
              <input name="currency" className="input" defaultValue={currency} />
            </div>
            <input name="date" type="date" className="input" defaultValue={today} />
            <input name="note" className="input" placeholder="Note (optional)" />
            <button className="btn btn-ghost w-full">Save settlement</button>
          </form>

          <form action={addGuest} className="card space-y-3 p-4">
            <p className="text-sm font-bold">Add guest (no account)</p>
            <input type="hidden" name="group_id" value={id} />
            <input name="guest_name" className="input" placeholder="Friend’s name" required />
            <button className="btn btn-ghost w-full">Add guest</button>
          </form>

          {settlements.length > 0 ? (
            <div className="card p-4">
              <p className="text-xs font-bold uppercase text-[var(--muted)]">Settlements</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {settlements.map((s) => (
                  <li key={s.id}>
                    {label(s.from_member)} → {label(s.to_member)}{" "}
                    {formatMoney(Number(s.amount), s.currency)}
                    <span className="text-[var(--muted)]"> · {s.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
