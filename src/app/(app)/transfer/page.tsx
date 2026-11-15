import { getAccounts } from "@/lib/data";
import { Empty } from "@/components/ui";
import { createTransfer } from "./actions";

export default async function TransferPage() {
  const accounts = (await getAccounts()).filter((a) => !a.archived);
  const today = new Date().toISOString().slice(0, 10);

  if (accounts.length < 2) {
    return (
      <div>
        <h1 className="mb-3 font-display text-2xl font-extrabold">Transfer</h1>
        <Empty>You need at least two accounts to transfer between them.</Empty>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Transfer</h1>
        <p className="text-sm text-[var(--muted)]">
          Move money between accounts without counting as income or expense
        </p>
      </div>

      <form action={createTransfer} className="card space-y-4 p-5 sm:max-w-lg">
        <div>
          <label className="label">From</label>
          <select name="from_account_id" className="input" defaultValue={accounts[0].id} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">To</label>
          <select name="to_account_id" className="input" defaultValue={accounts[1]?.id} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (৳)</label>
            <input name="amount" inputMode="decimal" className="input text-xl font-bold" required />
          </div>
          <div>
            <label className="label">Date</label>
            <input name="date" type="date" defaultValue={today} className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input name="note" className="input" placeholder="e.g. ATM cash out" />
        </div>
        <button className="btn btn-primary w-full">Transfer</button>
      </form>
    </div>
  );
}
