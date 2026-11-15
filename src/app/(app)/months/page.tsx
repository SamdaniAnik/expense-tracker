import Link from "next/link";
import { getAccounts, getTransactions, getTransactionsBefore } from "@/lib/data";
import { formatBDT, toPaisa, fromPaisa } from "@/lib/money";
import { accountBalanceAsOf, excelMonthSummary } from "@/lib/balances";
import { getExcelMonthSummary } from "@/lib/month-summaries";
import { accountKeyFromName } from "@/lib/account-key";
import { StatTile, Empty } from "@/components/ui";
import MonthJump from "@/components/MonthJump";
import MonthLedgerTable from "@/components/MonthLedgerTable";
import type { Transaction } from "@/lib/types";

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

  const sheet = getExcelMonthSummary(month);
  const [accounts, monthTxnsRaw, priorTxns] = await Promise.all([
    getAccounts(),
    getTransactions({ month, lean: true }),
    sheet ? Promise.resolve([]) : getTransactionsBefore(monthStart),
  ]);

  const active = accounts.filter((a) => !a.archived);

  const txns = [...(monthTxnsRaw as Transaction[])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(a.created_at),
  );

  const summary = excelMonthSummary(
    active,
    sheet ? monthTxnsRaw : [...priorTxns, ...monthTxnsRaw],
    month,
    sheet,
  );
  const startingOverall = summary.opening;
  const closingOverall = summary.closing;
  const incomeP = toPaisa(summary.income);
  const expenseP = toPaisa(summary.expense);

  const beginRows = active
    .filter((a) => a.opening_date <= monthStart || sheet?.accounts?.[accountKeyFromName(a.name)])
    .map((a) => {
      const key = accountKeyFromName(a.name);
      const fromSheet = key ? sheet?.accounts?.[key] : undefined;
      return {
        account: a,
        balance:
          typeof fromSheet === "number"
            ? fromSheet
            : accountBalanceAsOf(a, priorTxns, monthStart),
      };
    });

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const label = new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const addHref = `/add?m=${month}&date=${defaultAddDate(month)}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 rise">
        <Link href={`/months?m=${shiftMonth(month, -1)}`} className="btn btn-ghost px-3.5 text-lg" aria-label="Previous month">
          ‹
        </Link>
        <div className="text-center">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Ledger</p>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{label}</h1>
          <p className="text-xs text-[var(--faint)]">Excel-style ledger · search &amp; sort</p>
        </div>
        <Link href={`/months?m=${shiftMonth(month, 1)}`} className="btn btn-ghost px-3.5 text-lg" aria-label="Next month">
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
        <div className="card card-hover rise p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">
            Overall balance (start of month)
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatBDT(startingOverall)}
          </p>
          <p className="mt-1 text-xs text-[var(--faint)]">
            Same as Excel Overall Balance column
          </p>
        </div>
        <div
          className="card card-hover rise rise-1 p-4"
          style={{
            background: "color-mix(in srgb, var(--gold) 14%, var(--surface))",
            borderColor: "color-mix(in srgb, var(--gold) 45%, transparent)",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
            Closing balance
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatBDT(closingOverall)}
          </p>
          <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--gold) 80%, var(--muted))" }}>
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
        <MonthLedgerTable
          rows={txns.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description || "",
            category: t.category,
            account: accountName.get(t.account_id) ?? "—",
            type: t.type,
            amount: Number(t.amount),
          }))}
          beginRows={beginRows.map(({ account, balance }) => ({
            id: `begin-${account.id}`,
            dateLabel: new Date(monthStart + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            }),
            account: account.name,
            balance,
          }))}
          incomeTotal={fromPaisa(incomeP)}
          expenseTotal={fromPaisa(expenseP)}
          startingOverall={startingOverall}
          closingOverall={closingOverall}
        />
      )}
    </div>
  );
}
