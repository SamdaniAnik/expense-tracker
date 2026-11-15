import Link from "next/link";
import { getAccounts, getAllTransactions, getTransactions } from "@/lib/data";
import { overallBalance, accountBalance, monthTotals } from "@/lib/balances";
import { formatBDT } from "@/lib/money";
import { StatTile, SectionTitle, AccountCard, TxRow, Empty } from "@/components/ui";

export default async function DashboardPage() {
  const [accounts, txns, recent] = await Promise.all([
    getAccounts(),
    getAllTransactions(),
    getTransactions({ limit: 8 }),
  ]);

  const active = accounts.filter((a) => !a.archived);
  const total = overallBalance(active, txns);
  const now = new Date();
  const month = monthTotals(txns, now.getFullYear(), now.getMonth() + 1);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">Total balance</p>
          <p
            className="text-3xl font-extrabold tabular-nums"
            style={{ color: total < 0 ? "var(--expense)" : "var(--text)" }}
          >
            {formatBDT(total)}
          </p>
        </div>
        <Link
          href="/accounts"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-lg"
          aria-label="Accounts & settings"
        >
          ⚙️
        </Link>
      </header>

      <SectionTitle>{monthLabel}</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Income" value={month.income} tone="income" />
        <StatTile label="Expense" value={month.expense} tone="expense" />
        <StatTile label="Net" value={month.net} tone={month.net < 0 ? "expense" : "income"} />
      </div>

      <SectionTitle action={<Link href="/accounts" className="text-xs font-semibold text-[var(--primary)]">Manage</Link>}>
        Accounts
      </SectionTitle>
      {active.length === 0 ? (
        <Empty>
          No accounts yet.{" "}
          <Link href="/accounts" className="font-semibold text-[var(--primary)]">Add one</Link>.
        </Empty>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {active.map((a) => (
            <AccountCard key={a.id} account={a} balance={accountBalance(a, txns)} />
          ))}
        </div>
      )}

      <SectionTitle action={<Link href="/months" className="text-xs font-semibold text-[var(--primary)]">By month</Link>}>
        Recent
      </SectionTitle>
      {recent.length === 0 ? (
        <Empty>
          Nothing logged yet. Tap <span className="font-semibold text-[var(--primary)]">＋</span> to add your first transaction.
        </Empty>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {recent.map((t) => (
            <TxRow key={t.id} tx={t} accountName={accountName.get(t.account_id) ?? "—"} />
          ))}
        </div>
      )}
    </div>
  );
}
