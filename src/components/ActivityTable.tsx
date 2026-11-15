"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { formatBDT } from "@/lib/money";

export type ActivityRow = {
  id: string;
  date: string;
  description: string;
  category: string | null;
  note?: string | null;
  tags?: string[];
  account: string;
  type: "income" | "expense";
  amount: number;
};

export default function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  const columns: DataTableColumn<ActivityRow>[] = [
    {
      id: "date",
      header: "Date",
      searchText: (r) => r.date,
      sortValue: (r) => r.date,
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-[var(--muted)]">
          {new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "description",
      header: "Description",
      searchText: (r) =>
        `${r.description} ${r.category ?? ""} ${r.note ?? ""} ${(r.tags ?? []).join(" ")}`,
      sortValue: (r) => r.description,
      cell: (r) => (
        <div className="min-w-0">
          <Link
            href={`/transactions/${r.id}/edit`}
            className="font-semibold hover:text-[var(--primary)]"
          >
            {r.description || r.category || "Transaction"}
          </Link>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {r.category ? <span className="dt-chip">{r.category}</span> : null}
            {(r.tags ?? []).map((t) => (
              <span key={t} className="dt-chip">
                #{t}
              </span>
            ))}
          </div>
          {r.note ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{r.note}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "account",
      header: "Account",
      searchText: (r) => r.account,
      sortValue: (r) => r.account,
      cell: (r) => <span className="text-[var(--muted)]">{r.account}</span>,
    },
    {
      id: "type",
      header: "Type",
      searchText: (r) => r.type,
      sortValue: (r) => r.type,
      cell: (r) => (
        <span
          className="dt-chip"
          style={{
            background: r.type === "income" ? "var(--income-soft)" : "var(--expense-soft)",
            color: r.type === "income" ? "var(--income)" : "var(--expense)",
          }}
        >
          {r.type === "income" ? "Income" : "Expense"}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      searchText: (r) => String(r.amount),
      sortValue: (r) => r.amount,
      cell: (r) => (
        <Link
          href={`/transactions/${r.id}/edit`}
          className="tabular-nums font-bold hover:underline"
          style={{ color: r.type === "income" ? "var(--income)" : "var(--expense)" }}
        >
          {r.type === "income" ? "+" : "−"}
          {formatBDT(r.amount)}
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchPlaceholder="Search description, category, account…"
      empty="No transactions match your search."
      pageSize={25}
      minWidth="36rem"
      toolbarExtra={
        <span className="text-xs font-semibold text-[var(--muted)]">
          {rows.length} rows
        </span>
      }
    />
  );
}
