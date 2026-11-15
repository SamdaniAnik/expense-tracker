import { getAccounts, getTransactions } from "@/lib/data";
import { totals } from "@/lib/balances";
import { formatBDT } from "@/lib/money";
import { Empty } from "@/components/ui";
import TxFilters from "@/components/TxFilters";
import ActivityTable from "@/components/ActivityTable";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; account?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, txns] = await Promise.all([
    getAccounts(),
    getTransactions({ month: sp.month, accountId: sp.account, search: sp.q, lean: true }),
  ]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const sum = totals(txns);

  return (
    <div>
      <div className="mb-4 rise">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Ledger</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Activity</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Search, filter, and sort every entry</p>
      </div>

      <TxFilters accounts={accounts} />

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <Sum label="In" value={sum.income} color="var(--income)" soft="var(--income-soft)" />
        <Sum label="Out" value={sum.expense} color="var(--expense)" soft="var(--expense-soft)" />
        <Sum
          label="Net"
          value={sum.net}
          color={sum.net < 0 ? "var(--expense)" : "var(--income)"}
          soft={sum.net < 0 ? "var(--expense-soft)" : "var(--income-soft)"}
        />
      </div>

      {txns.length === 0 ? (
        <Empty>No transactions match these filters.</Empty>
      ) : (
        <ActivityTable
          rows={txns.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description || "",
            category: t.category,
            account: accountName.get(t.account_id) ?? "—",
            type: t.type,
            amount: Number(t.amount),
          }))}
        />
      )}
    </div>
  );
}

function Sum({
  label,
  value,
  color,
  soft,
}: {
  label: string;
  value: number;
  color: string;
  soft: string;
}) {
  return (
    <div
      className="card card-hover p-3"
      style={{ background: soft, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` }}
    >
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold tabular-nums sm:text-base" style={{ color }}>
        {formatBDT(value)}
      </div>
    </div>
  );
}
