import Link from "next/link";
import { getAccounts, getAllTransactions, getTransactions } from "@/lib/data";
import { formatBDT, toPaisa, fromPaisa } from "@/lib/money";
import {
  accountBalanceAsOf,
  runningOverallBalances,
} from "@/lib/balances";
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

/** Opening overall for a month = openings started by month-start + all prior txns. */
function monthOpeningPaisa(
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

  // Excel-style: chronological within the month (oldest → newest)
  const txns = [...(monthTxnsRaw as Transaction[])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at),
  );

  const startPaisa = monthOpeningPaisa(active, allTxns, monthStart);
  const openingOverall = fromPaisa(startPaisa);
  const running = runningOverallBalances(startPaisa, txns);
  const closingOverall =
    running.length > 0 ? running[running.length - 1]! : openingOverall;

  let incomeP = 0;
  let expenseP = 0;
  for (const t of txns) {
    const p = toPaisa(t.amount);
    if (t.type === "income") incomeP += p;
    else expenseP += p;
  }

  // Beginning Balance rows per account (like the spreadsheet)
  const priorTxns = allTxns.filter((t) => t.date < monthStart);
  const beginRows = active
    .filter((a) => a.opening_date <= monthStart)
    .map((a) => ({
      account: a,
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

      {/* Excel-style overall balance */}
      <div className="mb-3 card p-4">
        <p className="text-sm font-semibold text-[var(--muted)]">Overall balance</p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--muted)]">Opening (start of month)</p>
            <p className="text-xl font-extrabold tabular-nums">{formatBDT(openingOverall)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted)]">Closing (end of month)</p>
            <p
              className="text-2xl font-extrabold tabular-nums"
              style={{ color: closingOverall < 0 ? "var(--expense)" : "var(--text)" }}
            >
              {formatBDT(closingOverall)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Closing = Opening + Income − Expense ({formatBDT(openingOverall)} +{" "}
          {formatBDT(fromPaisa(incomeP))} − {formatBDT(fromPaisa(expenseP))})
        </p>
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
                  <th className="px-3 py-2.5 text-right font-semibold">Overall Balance</th>
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
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--muted)]">
                      {/* Sheet shows per-account balance on begin rows */}
                      {formatBDT(balance)}
                      <div className="text-[0.65rem] font-normal normal-case tracking-normal">
                        account bal.
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Overall opening marker (sum of accounts) */}
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <td className="px-3 py-2.5 text-[var(--muted)]" colSpan={5}>
                    <span className="font-semibold text-[var(--text)]">Overall opening</span>
                    <span className="text-xs"> — start of {label}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-extrabold">
                    {formatBDT(openingOverall)}
                  </td>
                </tr>

                {txns.map((t, i) => (
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
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold">
                      {formatBDT(running[i]!)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--surface-2)] text-sm font-bold">
                  <td className="px-3 py-2.5" colSpan={3}>
                    Month total / closing overall
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--income)" }}>
                    {formatBDT(fromPaisa(incomeP))}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--expense)" }}>
                    {formatBDT(fromPaisa(expenseP))}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
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
