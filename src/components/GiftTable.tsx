"use client";

import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { formatBDT } from "@/lib/money";
import { deleteGift } from "@/app/(app)/gifts/actions";
import type { GiftList } from "@/lib/gifts";

export type GiftRow = {
  id: string;
  name: string;
  amount: number | null;
  item: string | null;
};

export default function GiftTable({
  rows,
  list,
  cashTotal,
}: {
  rows: GiftRow[];
  list: GiftList;
  cashTotal: number;
}) {
  const columns: DataTableColumn<GiftRow>[] = [
    {
      id: "index",
      header: "#",
      width: "3.5rem",
      sortable: false,
      cell: (_r, i) => (
        <span className="tabular-nums text-[var(--muted)]">{i + 1}</span>
      ),
    },
    {
      id: "name",
      header: "Name",
      searchText: (r) => r.name,
      sortValue: (r) => r.name,
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      searchText: (r) => (r.amount != null ? String(r.amount) : ""),
      sortValue: (r) => r.amount ?? -1,
      cell: (r) =>
        r.amount != null ? (
          <span className="tabular-nums font-semibold" style={{ color: "var(--income)" }}>
            {formatBDT(r.amount)}
          </span>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        ),
    },
    {
      id: "item",
      header: "Item",
      searchText: (r) => r.item ?? "",
      sortValue: (r) => r.item ?? "",
      cell: (r) => <span className="text-[var(--muted)]">{r.item || ""}</span>,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      sortable: false,
      width: "5rem",
      cell: (r) => (
        <form action={deleteGift}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="list" value={list} />
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--expense)] hover:bg-[var(--expense-soft)]"
          >
            Delete
          </button>
        </form>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchPlaceholder="Search name, amount, or item…"
      empty="No gifts match your search."
      pageSize={25}
      minWidth="28rem"
      toolbarExtra={
        <span className="text-xs font-semibold text-[var(--muted)]">
          {rows.length} gifts
        </span>
      }
      footer={
        <tr>
          <td colSpan={2}>Cash total</td>
          <td className="text-right tabular-nums" style={{ color: "var(--income)" }}>
            {formatBDT(cashTotal)}
          </td>
          <td colSpan={2} />
        </tr>
      }
    />
  );
}
