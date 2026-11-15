import { getDebts, debtTotals } from "@/lib/debts";
import { formatBDT } from "@/lib/money";
import { DEBT_KIND_LABEL } from "@/lib/types";
import { Empty, SectionTitle, StatTile } from "@/components/ui";
import { createDebt, deleteDebt, payDebt, settleDebt } from "./actions";

export default async function DebtsPage() {
  const debts = await getDebts(true);
  const open = debts.filter((d) => !d.settled);
  const settled = debts.filter((d) => d.settled);
  const totals = debtTotals(open);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Loans &amp; debts</h1>
        <p className="text-sm text-[var(--muted)]">Track money you owe and money others owe you</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <StatTile label="I owe" value={totals.owe} tone="expense" />
        <StatTile label="Owed to me" value={totals.lent} tone="income" />
        <StatTile label="Net" value={totals.net} tone={totals.net < 0 ? "expense" : "income"} />
      </div>

      {open.length === 0 ? (
        <Empty>No open debts. Add one below.</Empty>
      ) : (
        <div className="mb-6 space-y-3">
          {open.map((d) => (
            <div key={d.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {DEBT_KIND_LABEL[d.kind]}
                    {d.counterparty ? ` · ${d.counterparty}` : ""}
                    {d.due_date ? ` · due ${d.due_date}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-lg font-extrabold tabular-nums"
                    style={{ color: d.kind === "owe" ? "var(--expense)" : "var(--income)" }}
                  >
                    {formatBDT(Number(d.remaining))}
                  </p>
                  <p className="text-[0.65rem] text-[var(--muted)]">
                    of {formatBDT(Number(d.principal))}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={payDebt} className="flex flex-1 gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <input
                    name="amount"
                    inputMode="decimal"
                    placeholder="Payment"
                    className="input"
                    required
                  />
                  <button className="btn btn-ghost shrink-0 text-sm">Pay</button>
                </form>
                <form action={settleDebt}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="btn btn-ghost text-sm">Settle</button>
                </form>
                <form action={deleteDebt}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs font-semibold text-[var(--expense)]">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Add debt</SectionTitle>
      <form action={createDebt} className="card space-y-3 p-4 sm:max-w-lg">
        <div>
          <label className="label">Type</label>
          <select name="kind" className="input" defaultValue="owe">
            <option value="owe">I owe someone</option>
            <option value="lent">Someone owes me</option>
          </select>
        </div>
        <div>
          <label className="label">Title</label>
          <input name="name" className="input" placeholder="e.g. Personal loan" required />
        </div>
        <div>
          <label className="label">Person</label>
          <input name="counterparty" className="input" placeholder="Name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (৳)</label>
            <input name="principal" inputMode="decimal" className="input" required />
          </div>
          <div>
            <label className="label">Due date</label>
            <input name="due_date" type="date" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Note</label>
          <input name="note" className="input" />
        </div>
        <button className="btn btn-primary w-full">Add</button>
      </form>

      {settled.length > 0 ? (
        <>
          <SectionTitle>Settled</SectionTitle>
          <div className="space-y-2 opacity-70">
            {settled.map((d) => (
              <div key={d.id} className="card flex justify-between p-3 text-sm">
                <span>{d.name}</span>
                <form action={deleteDebt}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs text-[var(--expense)]">Delete</button>
                </form>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
