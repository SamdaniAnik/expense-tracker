import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGiftEntries,
  giftCashTotal,
  giftItemCount,
  GIFT_LIST_LABEL,
  type GiftList,
} from "@/lib/gifts";
import { formatBDT } from "@/lib/money";
import { Empty } from "@/components/ui";
import GiftAddForm from "@/components/GiftAddForm";
import { deleteGift } from "../actions";

function isList(v: string): v is GiftList {
  return v === "biyer" || v === "babur";
}

export default async function GiftListPage({
  params,
}: {
  params: Promise<{ list: string }>;
}) {
  const { list: raw } = await params;
  if (!isList(raw)) notFound();
  const list = raw;

  const entries = await getGiftEntries(list);
  const gifts = entries.filter((e) => e.kind === "gift");
  const meta = entries.filter((e) => e.kind === "meta");
  const cash = giftCashTotal(entries);
  const items = giftItemCount(entries);
  const label = GIFT_LIST_LABEL[list];

  const metaCash = meta.find((m) => /total cash/i.test(m.name) && !/grand/i.test(m.name));
  const metaExpense = meta.find((m) => /total expense/i.test(m.name));
  const metaGrand = meta.find((m) => /grand total/i.test(m.name));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/gifts" className="text-xs font-semibold text-[var(--primary)]">
            ← All gift lists
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{label}</h1>
          <p className="text-sm text-[var(--muted)]">
            From the Google Sheet · separate from monthly expenses
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">Entries</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{gifts.length}</p>
        </div>
        <div className="card p-4" style={{ background: "#ecfdf5", borderColor: "#a7f3d0" }}>
          <p className="text-xs font-semibold" style={{ color: "#047857" }}>
            Cash gifts
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: "#047857" }}>
            {formatBDT(cash)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">Item gifts</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{items}</p>
        </div>
        {metaGrand?.amount != null ? (
          <div className="card p-4" style={{ background: "#fef9c3", borderColor: "#fde047" }}>
            <p className="text-xs font-semibold" style={{ color: "#854d0e" }}>
              {metaGrand.name}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatBDT(Number(metaGrand.amount))}</p>
          </div>
        ) : (
          <div className="card p-4">
            <p className="text-xs text-[var(--muted)]">Sheet cash total</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {metaCash?.amount != null ? formatBDT(Number(metaCash.amount)) : "—"}
            </p>
          </div>
        )}
      </div>

      {metaExpense?.amount != null ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Sheet total expense:{" "}
          <span className="font-semibold text-[var(--expense)]">
            {formatBDT(Number(metaExpense.amount))}
          </span>
          {metaCash?.amount != null ? (
            <>
              {" "}
              · listed cash in hand:{" "}
              <span className="font-semibold">{formatBDT(Number(metaCash.amount))}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <GiftAddForm list={list} />
        </div>

        <div className="lg:col-span-8">
          {gifts.length === 0 ? (
            <Empty>
              No gifts yet. Add one on the left, or run{" "}
              <code className="text-xs">npm run seed:google</code> after creating the table.
            </Empty>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-3 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">Name</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                      <th className="px-3 py-2.5 font-semibold">Item</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {gifts.map((g, i) => (
                      <tr key={g.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2.5 tabular-nums text-[var(--muted)]">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{g.name}</td>
                        <td
                          className="px-3 py-2.5 text-right tabular-nums font-semibold"
                          style={{ color: "var(--income)" }}
                        >
                          {g.amount != null ? formatBDT(Number(g.amount)) : ""}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--muted)]">{g.item || ""}</td>
                        <td className="px-3 py-2.5 text-right">
                          <form action={deleteGift}>
                            <input type="hidden" name="id" value={g.id} />
                            <input type="hidden" name="list" value={list} />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-[var(--expense)]"
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--surface-2)] text-sm font-bold">
                      <td className="px-3 py-2.5" colSpan={2}>
                        Cash total
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--income)" }}>
                        {formatBDT(cash)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
