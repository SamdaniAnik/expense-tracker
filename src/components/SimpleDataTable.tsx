"use client";

import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { formatBDT } from "@/lib/money";

type NamedValue = { name: string; value: number };
type AccountFlow = { name: string; income: number; expense: number };

export function NamedValueTable({
  rows,
  valueLabel = "Total",
  tone = "expense",
}: {
  rows: NamedValue[];
  valueLabel?: string;
  tone?: "income" | "expense";
}) {
  const color = tone === "income" ? "var(--income)" : "var(--expense)";
  const columns: DataTableColumn<NamedValue>[] = [
    {
      id: "name",
      header: "Name",
      searchText: (r) => r.name,
      sortValue: (r) => r.name,
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      id: "value",
      header: valueLabel,
      align: "right",
      searchText: (r) => String(r.value),
      sortValue: (r) => r.value,
      cell: (r) => (
        <span className="tabular-nums font-semibold" style={{ color }}>
          {formatBDT(r.value)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r, i) => `${r.name}-${i}`}
      searchPlaceholder="Search…"
      pageSize={10}
      minWidth="20rem"
      empty="No rows."
    />
  );
}

export function AccountFlowTable({ rows }: { rows: AccountFlow[] }) {
  const columns: DataTableColumn<AccountFlow>[] = [
    {
      id: "name",
      header: "Account",
      searchText: (r) => r.name,
      sortValue: (r) => r.name,
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      id: "income",
      header: "In",
      align: "right",
      searchText: (r) => String(r.income),
      sortValue: (r) => r.income,
      cell: (r) => (
        <span className="tabular-nums" style={{ color: "var(--income)" }}>
          {formatBDT(r.income)}
        </span>
      ),
    },
    {
      id: "expense",
      header: "Out",
      align: "right",
      searchText: (r) => String(r.expense),
      sortValue: (r) => r.expense,
      cell: (r) => (
        <span className="tabular-nums" style={{ color: "var(--expense)" }}>
          {formatBDT(r.expense)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.name}
      searchPlaceholder="Search accounts…"
      pageSize={10}
      minWidth="22rem"
      empty="No account activity."
    />
  );
}
