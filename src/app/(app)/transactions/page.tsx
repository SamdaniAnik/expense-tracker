import { getAccounts, getTransactions } from "@/lib/data";
import { totals } from "@/lib/balances";
import { formatBDT } from "@/lib/money";
import { TxRow, Empty } from "@/components/ui";
import TxFilters from "@/components/TxFilters";
import type { Transaction } from "@/lib/types";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; account?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, txns] = await Promise.all([
    getAccounts(),
    getTransactions({ month: sp.month, accountId: sp.account, search: sp.q }),
  ]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const sum = totals(txns);

  // group by date (newest first — txns are already date-desc from the query)
  const groups: Record<string, Transaction[]> = {};
  for (const t of txns) (groups[t.date] ??= []).push(t);
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Activity</h1>
      <TxFilters accounts={accounts} />

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Sum label="In" value={sum.income} color="var(--income)" />
        <Sum label="Out" value={sum.expense} color="var(--expense)" />
        <Sum label="Net" value={sum.net} color={sum.net < 0 ? "var(--expense)" : "var(--text)"} />
      </div>

      {txns.length === 0 ? (
        <Empty>No transactions match these filters.</Empty>
      ) : (
        <div className="space-y-4">
          {dates.map((d) => (
            <div key={d}>
              <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="card divide-y divide-[var(--border)] overflow-hidden">
                {groups[d].map((t) => (
                  <TxRow key={t.id} tx={t} accountName={accountName.get(t.account_id) ?? "—"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sum({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-2.5">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-sm font-bold tabular-nums" style={{ color }}>
        {formatBDT(value)}
      </div>
    </div>
  );
}
