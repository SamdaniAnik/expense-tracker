"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBDT } from "@/lib/money";
import { TxRow } from "@/components/ui";
import type { Transaction } from "@/lib/types";

/** Mobile list by default; Excel table only when viewport is truly desktop-wide. */
export default function HomeRecent({
  rows,
  accountName,
  monthLabel,
  addHref,
}: {
  rows: Transaction[];
  accountName: Record<string, string>;
  monthLabel: string;
  addHref: string;
}) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
        No transactions in {monthLabel}.{" "}
        <Link href={addHref} className="font-semibold text-[var(--primary)]">
          Add one
        </Link>
        .
      </div>
    );
  }

  if (!desktop) {
    return (
      <>
        <div className="card max-w-full divide-y divide-[var(--border)] overflow-hidden">
          {rows.slice(0, 40).map((t) => (
            <TxRow key={t.id} tx={t} accountName={accountName[t.account_id] ?? "—"} />
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {rows.length} entries · newest first
        </p>
      </>
    );
  }

  return (
    <>
      <div className="card max-w-full overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] text-left text-[0.68rem] font-extrabold uppercase tracking-[0.06em] text-[var(--muted)]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Income</th>
                <th className="px-4 py-3 text-right">Expense</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[var(--border)] transition-colors last:border-0 odd:bg-[color-mix(in_srgb,var(--surface-2)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface))]"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--muted)]">
                    <Link href={`/transactions/${t.id}/edit`} className="hover:text-[var(--primary)]">
                      {new Date(t.date + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/transactions/${t.id}/edit`}
                      className="font-medium hover:text-[var(--primary)]"
                    >
                      {t.description || "—"}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
                    {accountName[t.account_id] ?? "—"}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right tabular-nums font-semibold"
                    style={{ color: "var(--income)" }}
                  >
                    {t.type === "income" ? formatBDT(Number(t.amount)) : ""}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right tabular-nums font-semibold"
                    style={{ color: "var(--expense)" }}
                  >
                    {t.type === "expense" ? formatBDT(Number(t.amount)) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {rows.length} entries · newest first
      </p>
    </>
  );
}
