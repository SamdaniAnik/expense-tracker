"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { formatBDT } from "@/lib/money";

export type LedgerTxnRow = {
  id: string;
  date: string;
  description: string;
  category: string | null;
  account: string;
  type: "income" | "expense";
  amount: number;
};

export type BeginRow = {
  id: string;
  dateLabel: string;
  account: string;
  balance: number;
};

function formatDay(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function initials(s: string) {
  return (s || "?").trim().charAt(0).toUpperCase();
}

export default function MonthLedgerTable({
  rows,
  beginRows,
  incomeTotal,
  expenseTotal,
  startingOverall,
  closingOverall,
}: {
  rows: LedgerTxnRow[];
  beginRows: BeginRow[];
  incomeTotal: number;
  expenseTotal: number;
  startingOverall: number;
  closingOverall: number;
}) {
  const columns: DataTableColumn<LedgerTxnRow>[] = [
    {
      id: "date",
      header: "Date",
      searchText: (r) => r.date,
      sortValue: (r) => r.date,
      cell: (r) => (
        <Link
          href={`/transactions/${r.id}/edit`}
          className="whitespace-nowrap tabular-nums text-[var(--muted)] hover:text-[var(--primary)]"
        >
          {formatDay(r.date)}
        </Link>
      ),
    },
    {
      id: "description",
      header: "Description",
      searchText: (r) => `${r.description} ${r.category ?? ""}`,
      sortValue: (r) => r.description,
      cell: (r) => (
        <div>
          <Link
            href={`/transactions/${r.id}/edit`}
            className="font-medium hover:text-[var(--primary)]"
          >
            {r.description || "—"}
          </Link>
          {r.category ? (
            <div className="mt-0.5">
              <span className="dt-chip">{r.category}</span>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "account",
      header: "Account",
      searchText: (r) => r.account,
      sortValue: (r) => r.account,
      cell: (r) => (
        <span className="whitespace-nowrap text-[var(--muted)]">{r.account}</span>
      ),
    },
    {
      id: "income",
      header: "Income",
      align: "right",
      searchText: (r) => (r.type === "income" ? String(r.amount) : ""),
      sortValue: (r) => (r.type === "income" ? r.amount : 0),
      cell: (r) =>
        r.type === "income" ? (
          <span className="tabular-nums font-semibold" style={{ color: "var(--income)" }}>
            {formatBDT(r.amount)}
          </span>
        ) : null,
    },
    {
      id: "expense",
      header: "Expense",
      align: "right",
      searchText: (r) => (r.type === "expense" ? String(r.amount) : ""),
      sortValue: (r) => (r.type === "expense" ? r.amount : 0),
      cell: (r) =>
        r.type === "expense" ? (
          <span className="tabular-nums font-semibold" style={{ color: "var(--expense)" }}>
            {formatBDT(r.amount)}
          </span>
        ) : null,
    },
    {
      id: "overall",
      header: (
        <span>
          Overall Balance
          <div className="font-normal normal-case tracking-normal text-[0.65rem]">
            start of month
          </div>
        </span>
      ),
      align: "right",
      sortable: false,
      cell: () => null,
    },
  ];

  const pinned =
    beginRows.length > 0 ? (
      <>
        {beginRows.map((b) => (
          <tr key={b.id} className="dt-pin">
            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{b.dateLabel}</td>
            <td className="px-3 py-2.5 font-medium text-[var(--text)]">Beginning Balance</td>
            <td className="whitespace-nowrap px-3 py-2.5">{b.account}</td>
            <td />
            <td />
            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--text)]">
              {formatBDT(b.balance)}
            </td>
          </tr>
        ))}
      </>
    ) : null;

  const goldBg = "color-mix(in srgb, var(--gold) 20%, var(--surface))";
  const footer = (
    <>
      <tr>
        <td colSpan={3}>Month totals</td>
        <td
          className="text-right tabular-nums"
          style={{ background: "var(--income-soft)", color: "var(--income)" }}
        >
          {formatBDT(incomeTotal)}
        </td>
        <td
          className="text-right tabular-nums"
          style={{ background: "var(--expense-soft)", color: "var(--expense)" }}
        >
          {formatBDT(expenseTotal)}
        </td>
        <td className="text-right tabular-nums">
          {formatBDT(startingOverall)}
          <div className="text-[0.65rem] font-normal text-[var(--muted)]">start of month</div>
        </td>
      </tr>
      <tr>
        <td colSpan={5} style={{ color: "var(--gold)", background: goldBg }}>
          Closing overall balance
        </td>
        <td
          className="text-right tabular-nums"
          style={{ color: "var(--text)", background: goldBg }}
        >
          {formatBDT(closingOverall)}
        </td>
      </tr>
    </>
  );

  return (
    <>
      {/* Phone: stacked list — no 44rem Excel table */}
      <div className="lg:hidden">
        {beginRows.length > 0 ? (
          <div className="card mb-3 divide-y divide-[var(--border)] overflow-hidden">
            {beginRows.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Beginning Balance</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {b.dateLabel} · {b.account}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums">{formatBDT(b.balance)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--muted)]">No ledger rows.</div>
        ) : (
          <div className="card divide-y divide-[var(--border)] overflow-hidden">
            {rows.map((r) => {
              const income = r.type === "income";
              return (
                <Link
                  key={r.id}
                  href={`/transactions/${r.id}/edit`}
                  className="flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-[var(--surface-2)]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold"
                    style={{
                      background: income ? "var(--income-soft)" : "var(--expense-soft)",
                      color: income ? "var(--income)" : "var(--expense)",
                    }}
                  >
                    {initials(r.description || r.category || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.description || "—"}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {r.account}
                      {r.category ? ` · ${r.category}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className="whitespace-nowrap text-sm font-bold tabular-nums"
                      style={{ color: income ? "var(--income)" : "var(--expense)" }}
                    >
                      {income ? "+" : "−"}
                      {formatBDT(r.amount)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{formatDay(r.date)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="card mt-3 space-y-2 p-3.5 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">Income</span>
            <span className="font-bold tabular-nums" style={{ color: "var(--income)" }}>
              {formatBDT(incomeTotal)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">Expense</span>
            <span className="font-bold tabular-nums" style={{ color: "var(--expense)" }}>
              {formatBDT(expenseTotal)}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-t border-[var(--border)] pt-2">
            <span className="font-semibold" style={{ color: "var(--gold)" }}>
              Closing
            </span>
            <span className="font-extrabold tabular-nums">{formatBDT(closingOverall)}</span>
          </div>
          <p className="text-xs text-[var(--muted)]">{rows.length} entries · tap a row to edit</p>
        </div>
      </div>

      {/* Desktop: Excel-style searchable table */}
      <div className="hidden lg:block">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          searchPlaceholder="Search date, description, account…"
          empty="No ledger rows match your search."
          pageSize={50}
          pinnedRows={pinned}
          footer={footer}
          minWidth="44rem"
          toolbarExtra={
            <span className="text-xs font-semibold text-[var(--muted)]">
              {rows.length} entries
            </span>
          }
        />
      </div>
    </>
  );
}
