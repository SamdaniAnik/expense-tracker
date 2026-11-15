import Link from "next/link";
import { getAccounts, getAllTransactions, getTransactions } from "@/lib/data";
import { formatBDT, toPaisa, fromPaisa } from "@/lib/money";
import { accountBalanceAsOf } from "@/lib/balances";
import { StatTile, Empty } from "@/components/ui";
import MonthJump from "@/components/MonthJump";
import type { Account, Transaction } from "@/lib/types";

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultAddDate(month: string) {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (month === current) return now.toISOString().slice(0, 10);
  return `${month}-01`;
}

/** Starting overall for a month = openings by month-start + all prior txns. */
function monthStartingPaisa(
  accounts: Pick<Account, "opening_balance" | "opening_date">[],
  allTxns: Pick<Transaction, "date" | "type" | "amount">[],
  monthStart: string,
): number {
  let paisa = 0;
  for (const a of accounts) {
    if (a.opening_date <= monthStart) paisa += toPaisa(a.opening_balance);
  }
  for (const t of allTxns) {
    if (t.date < monthStart) {
      paisa += t.type === "income" ? toPaisa(t.amount) : -toPaisa(t.amount);
    }
  }
  return paisa;
}

export default async function MonthsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const month =
    sp.m ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${month}-01`;

  const [accounts, allTxns, monthTxnsRaw] = await Promise.all([
    getAccounts(),
    getAllTransactions(),
    getTransactions({ month }),
  ]);

  const active = accounts.filter((a) => !a.archived);

  const txns = [...(monthTxnsRaw as Transaction[])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at),
  );

  // Excel "Overall Balance" column = starting balance of the month
  const startPaisa = monthStartingPaisa(active, allTxns, monthStart);
  const startingOverall = fromPaisa(startPaisa);

  let incomeP = 0;
  let expenseP = 0;
  for (const t of txns) {
    const p = toPaisa(t.amount);
    if (t.type === "income") incomeP += p;
    else expenseP += p;
  }

  // Yellow cell in the sheet
  const closingOverall = fromPaisa(startPaisa + incomeP - expenseP);

  const priorTxns = allTxns.filter((t) => t.date < monthStart);
  const beginRows = active
    .filter((a) => a.opening_date <= monthStart)
    .map((a) => ({
      account: a,
      // Per-account starting balance for this month (Excel Beginning Balance rows)
      balance: accountBalanceAsOf(a, priorTxns, monthStart),
    }));

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const label = new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const addHref = `/add?m=${month}&date=${defaultAddDate(month)}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/months?m=${shiftMonth(month, -1)}`} className="btn btn-ghost px-3" aria-label="Previous month">
          ‹
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold">{label}</h1>
          <p className="text-xs text-[var(--muted)]">Month ledger</p>
        </div>
        <Link href={`/months?m=${shiftMonth(month, 1)}`} className="btn btn-ghost px-3" aria-label="Next month">
          ›
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MonthJump month={month} />
        <Link href={addHref} className="btn btn-primary ml-auto text-sm">
          ＋ Add in {label.split(" ")[0]}
        </Link>
      </div>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs font-medium text-[var(--muted)]">
            Overall balance (start of month)
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatBDT(startingOverall)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Same as Excel Overall Balance column
          </p>
        </div>
        <div className="card p-4" style={{ background: "#fef9c3", borderColor: "#fde047" }}>
          <p className="text-xs font-medium" style={{ color: "#854d0e" }}>
            Closing (yellow cell)
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: "#121826" }}>
            {formatBDT(closingOverall)}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#a16207" }}>
            Start + Income − Expense
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Income" value={fromPaisa(incomeP)} tone="income" />
        <StatTile label="Expense" value={fromPaisa(expenseP)} tone="expense" />
        <StatTile
          label="Net"
          value={fromPaisa(incomeP - expenseP)}
          tone={incomeP - expenseP < 0 ? "expense" : "income"}
        />
      </div>

      <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        Ledger
      </h2>

      {txns.length === 0 && beginRows.length === 0 ? (
        <Empty>
          No rows in {label}.{" "}
          <Link href={addHref} className="font-semibold text-[var(--primary)]">
            Add the first entry
          </Link>
          .
        </Empty>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Description</th>
                  <th className="px-3 py-2.5 font-semibold">Account</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Income</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Expense</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Overall Balance
                    <div className="font-normal normal-case tracking-normal text-[0.65rem]">
                      start of month
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {beginRows.map(({ account, balance }) => (
                  <tr
                    key={`begin-${account.id}`}
                    className="border-b border-[var(--border)] bg-[var(--surface-2)]/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[var(--muted)]">
                      {new Date(monthStart + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-medium">Beginning Balance</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{account.name}</td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                      {formatBDT(balance)}
                    </td>
                  </tr>
                ))}

                {txns.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[var(--muted)]">
                      <Link href={`/transactions/${t.id}/edit`} className="hover:text-[var(--primary)]">
                        {new Date(t.date + "T00:00:00").toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/transactions/${t.id}/edit`} className="font-medium hover:text-[var(--primary)]">
                        {t.description || "—"}
                      </Link>
                      {t.category ? (
                        <div className="text-xs text-[var(--muted)]">{t.category}</div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--muted)]">
                      {accountName.get(t.account_id) ?? "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right tabular-nums font-semibold"
                      style={{ color: "var(--income)" }}
                    >
                      {t.type === "income" ? formatBDT(t.amount) : ""}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right tabular-nums font-semibold"
                      style={{ color: "var(--expense)" }}
                    >
                      {t.type === "expense" ? formatBDT(t.amount) : ""}
                    </td>
                    {/* Excel leaves this blank on day-to-day rows */}
                    <td className="px-3 py-2.5" />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Excel summary row: Income | Expense | Overall Balance (starting) */}
                <tr className="border-t border-[var(--border)] bg-[var(--surface-2)] text-sm font-bold">
                  <td className="px-3 py-2.5" colSpan={3}>
                    Month totals
                  </td>
                  <td
                    className="px-3 py-2.5 text-right tabular-nums"
                    style={{ background: "#ecfdf5", color: "#047857" }}
                  >
                    {formatBDT(fromPaisa(incomeP))}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right tabular-nums"
                    style={{ background: "#fff1f2", color: "#be123c" }}
                  >
                    {formatBDT(fromPaisa(expenseP))}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatBDT(startingOverall)}
                    <div className="text-[0.65rem] font-normal text-[var(--muted)]">
                      start of month
                    </div>
                  </td>
                </tr>
                <tr className="text-sm font-bold" style={{ background: "#fef08a" }}>
                  <td className="px-3 py-2.5" colSpan={5} style={{ color: "#854d0e" }}>
                    Closing overall (yellow)
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "#121826" }}>
                    {formatBDT(closingOverall)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
