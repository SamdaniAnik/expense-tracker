import Link from "next/link";
import { getAccounts, getTransactions } from "@/lib/data";
import { formatBDT } from "@/lib/money";
import { toPaisa, fromPaisa } from "@/lib/money";
import { StatTile, Empty } from "@/components/ui";
import type { Transaction } from "@/lib/types";

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function MonthsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const month = sp.m ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [accounts, txns] = await Promise.all([
    getAccounts(),
    getTransactions({ month }),
  ]);

  let incomeP = 0;
  let expenseP = 0;
  const perAccount = new Map<string, { income: number; expense: number }>();
  for (const t of txns as Transaction[]) {
    const p = toPaisa(t.amount);
    if (t.type === "income") incomeP += p;
    else expenseP += p;
    const cur = perAccount.get(t.account_id) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += p;
    else cur.expense += p;
    perAccount.set(t.account_id, cur);
  }

  const label = new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/months?m=${shiftMonth(month, -1)}`} className="btn btn-ghost px-3">‹</Link>
        <h1 className="text-lg font-bold">{label}</h1>
        <Link href={`/months?m=${shiftMonth(month, 1)}`} className="btn btn-ghost px-3">›</Link>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Income" value={fromPaisa(incomeP)} tone="income" />
        <StatTile label="Expense" value={fromPaisa(expenseP)} tone="expense" />
        <StatTile label="Net" value={fromPaisa(incomeP - expenseP)} tone={incomeP - expenseP < 0 ? "expense" : "income"} />
      </div>

      <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">By account</h2>
      {txns.length === 0 ? (
        <Empty>No transactions in {label}.</Empty>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {accounts
            .filter((a) => perAccount.has(a.id))
            .map((a) => {
              const v = perAccount.get(a.id)!;
              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold">{a.name}</span>
                  <span className="text-sm tabular-nums">
                    <span style={{ color: "var(--income)" }}>+{formatBDT(fromPaisa(v.income))}</span>
                    {"  "}
                    <span style={{ color: "var(--expense)" }}>−{formatBDT(fromPaisa(v.expense))}</span>
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <div className="mt-5 text-center">
        <Link href="/insights" className="text-sm font-semibold text-[var(--primary)]">
          View charts →
        </Link>
      </div>
    </div>
  );
}
