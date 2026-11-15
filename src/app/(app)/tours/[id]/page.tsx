import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTourGroup,
  getTourMembers,
  getTourExpenses,
  getTourShares,
  getTourSettlements,
  getTourContributions,
  computeBalances,
  computePot,
  suggestSettlements,
  memberLabel,
} from "@/lib/tours";
import { formatMoney } from "@/lib/fx";
import { Empty, SectionTitle } from "@/components/ui";
import { TourExpenseForm } from "@/components/TourExpenseForm";
import {
  addContribution,
  addGuest,
  addSettlement,
  deleteContribution,
  deleteTourExpense,
  quickSettle,
} from "../actions";

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = await getTourGroup(id);
  if (!group) notFound();

  const [members, expenses, settlements, contributions] = await Promise.all([
    getTourMembers(id),
    getTourExpenses(id),
    getTourSettlements(id),
    getTourContributions(id),
  ]);
  const shares = await getTourShares(expenses.map((e) => e.id));
  const balances = computeBalances(members, expenses, shares, settlements);
  const suggestions = suggestSettlements(balances);
  const pot = computePot(members, contributions);
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

      {/* Shared pot */}
      <SectionTitle>Group pot · contributions</SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">Total in pot</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">
            {formatMoney(pot.total, currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">Fair share each</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">
            {formatMoney(pot.fairShare, currency)}
          </p>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-[var(--muted)]">Contributions</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">{contributions.length}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {members.map((m) => {
          const paid = pot.byMember.get(m.id) ?? 0;
          const vs = pot.vsFair.get(m.id) ?? 0;
          return (
            <div key={m.id} className="card flex items-center justify-between gap-2 p-3.5">
              <div>
                <p className="font-semibold">{memberLabel(m)}</p>
                <p className="text-xs text-[var(--muted)]">
                  paid in {formatMoney(paid, currency)}
                </p>
              </div>
              <span
                className="text-xs font-bold tabular-nums"
                style={{
                  color: vs > 0.009 ? "var(--income)" : vs < -0.009 ? "var(--expense)" : "var(--muted)",
                }}
              >
                {vs > 0.009
                  ? `+${formatMoney(vs, currency)} over`
                  : vs < -0.009
                    ? `${formatMoney(Math.abs(vs), currency)} short`
                    : "even"}
              </span>
            </div>
          );
        })}
      </div>

      <form action={addContribution} className="card mb-8 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <p className="text-sm font-bold sm:col-span-2 lg:col-span-6">Contribute money to the pot</p>
        <input type="hidden" name="group_id" value={id} />
        <select name="member_id" className="input lg:col-span-2" required defaultValue={members[0]?.id}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {memberLabel(m)}
            </option>
          ))}
        </select>
        <input name="amount" inputMode="decimal" className="input" placeholder="Amount" required />
        <input name="currency" className="input" defaultValue={currency} />
        <input name="date" type="date" className="input" defaultValue={today} />
        <input name="note" className="input sm:col-span-2 lg:col-span-4" placeholder="Note · e.g. hotel advance" />
        <button className="btn btn-primary lg:col-span-2">Add contribution</button>
      </form>

      {contributions.length > 0 ? (
        <div className="card mb-8 divide-y divide-[var(--border)] overflow-hidden">
          {contributions.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-semibold">
                  {label(c.member_id)} · {formatMoney(Number(c.amount), c.currency)}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {c.date}
                  {c.note ? ` · ${c.note}` : ""}
                </p>
              </div>
              <form action={deleteContribution}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="group_id" value={id} />
                <button type="submit" className="text-xs font-semibold text-[var(--expense)]">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      {/* Expense balances */}
      <SectionTitle>Expense balances</SectionTitle>
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
            Settle up (like Splitwise)
          </p>
          <ul className="mt-3 space-y-2">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2.5"
              >
                <p className="text-sm">
                  <strong>{label(s.from)}</strong> pays <strong>{label(s.to)}</strong>{" "}
                  <span className="font-bold tabular-nums">{formatMoney(s.amount, currency)}</span>
                </p>
                <form action={quickSettle}>
                  <input type="hidden" name="group_id" value={id} />
                  <input type="hidden" name="from_member" value={s.from} />
                  <input type="hidden" name="to_member" value={s.to} />
                  <input type="hidden" name="amount" value={String(s.amount)} />
                  <input type="hidden" name="currency" value={currency} />
                  <button type="submit" className="btn btn-primary text-xs">
                    Mark paid
                  </button>
                </form>
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
          {expenses.map((e) => {
            const eShares = shares.filter((s) => s.expense_id === e.id);
            const among = eShares.map((s) => label(s.member_id)).join(", ");
            return (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.description}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {e.date} · paid by {label(e.paid_by)}
                    {eShares.length > 0
                      ? ` · split ${eShares.length}/${members.length}: ${among}`
                      : ` · ${e.split_type}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums">
                    {formatMoney(Number(e.amount), e.currency)}
                  </span>
                  <form action={deleteTourExpense}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="group_id" value={id} />
                    <button type="submit" className="text-xs font-semibold text-[var(--expense)]">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <TourExpenseForm
          groupId={id}
          currency={currency}
          today={today}
          defaultPayer={members[0]?.id ?? ""}
          members={members.map((m) => ({ id: m.id, label: memberLabel(m) }))}
        />

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
