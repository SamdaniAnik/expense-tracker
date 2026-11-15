import { getAccounts, getAllTransactions } from "@/lib/data";
import { accountBalance } from "@/lib/balances";
import { formatBDT } from "@/lib/money";
import { ACCOUNT_TYPE_LABEL, type Account } from "@/lib/types";
import { createAccount, updateAccount, setArchived } from "./actions";
import SignOutButton from "@/components/SignOutButton";
import { SectionTitle } from "@/components/ui";

const TYPES = ["bank", "mobile", "cash"] as const;

export default async function AccountsPage() {
  const [accounts, txns] = await Promise.all([getAccounts(), getAllTransactions()]);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-4 rise">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Wallet</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Accounts</h1>
      </div>

      <div className="space-y-2.5">
        {active.map((a) => (
          <AccountItem key={a.id} account={a} balance={accountBalance(a, txns)} />
        ))}
      </div>

      <details className="card mt-3 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--primary)]">
          ＋ Add account
        </summary>
        <form action={createAccount} className="mt-3 space-y-3">
          <input name="name" placeholder="Account name" className="input" required />
          <div className="grid grid-cols-2 gap-2">
            <select name="type" className="input" defaultValue="bank">
              {TYPES.map((t) => (
                <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <input name="opening_date" type="date" defaultValue={today} className="input" />
          </div>
          <input name="opening_balance" inputMode="decimal" placeholder="Opening balance (৳)" className="input" />
          <button className="btn btn-primary w-full">Add account</button>
        </form>
      </details>

      {archived.length > 0 && (
        <>
          <SectionTitle>Archived</SectionTitle>
          <div className="space-y-2.5">
            {archived.map((a) => (
              <div key={a.id} className="card flex items-center justify-between p-4 opacity-70">
                <span className="text-sm font-semibold">{a.name}</span>
                <form action={setArchived}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="archived" value="false" />
                  <button className="text-xs font-semibold text-[var(--primary)]">Restore</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Tools</SectionTitle>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["/budgets", "Budgets"],
          ["/transfer", "Transfer"],
          ["/recurring", "Recurring"],
          ["/debts", "Loans"],
          ["/household", "Household"],
          ["/backup", "Backup"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="card card-hover px-3 py-3 text-center text-sm font-semibold">
            {label}
          </a>
        ))}
      </div>

      <SectionTitle>Session</SectionTitle>
      <SignOutButton />
      <p className="mt-6 text-center text-xs text-[var(--muted)]">Ledger · your private money tracker</p>
    </div>
  );
}

function AccountItem({ account, balance }: { account: Account; balance: number }) {
  const emoji = account.type === "bank" ? "🏦" : account.type === "mobile" ? "📱" : "💵";
  return (
    <details className="card card-hover overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-base ring-1 ring-[var(--border)]">
            {emoji}
          </span>
          <div>
            <div className="text-sm font-bold">{account.name}</div>
            <div className="text-xs text-[var(--muted)]">{ACCOUNT_TYPE_LABEL[account.type]}</div>
          </div>
        </div>
        <div className="text-base font-extrabold tabular-nums" style={{ color: balance < 0 ? "var(--expense)" : "var(--text)" }}>
          {formatBDT(balance)}
        </div>
      </summary>
      <form action={updateAccount} className="space-y-3 border-t border-[var(--border)] p-4">
        <input type="hidden" name="id" value={account.id} />
        <input name="name" defaultValue={account.name} className="input" required />
        <div className="grid grid-cols-2 gap-2">
          <select name="type" className="input" defaultValue={account.type}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <input name="opening_date" type="date" defaultValue={account.opening_date} className="input" />
        </div>
        <div>
          <label className="label">Opening balance (৳)</label>
          <input name="opening_balance" inputMode="decimal" defaultValue={String(account.opening_balance)} className="input" />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1">Save</button>
          <button
            formAction={setArchived}
            name="archived"
            value="true"
            className="btn btn-ghost"
          >
            Archive
          </button>
        </div>
      </form>
    </details>
  );
}
