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
          {new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
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
  );
}
