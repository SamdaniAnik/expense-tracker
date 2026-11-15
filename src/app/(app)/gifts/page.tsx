import Link from "next/link";
import { getGiftEntries, giftCashTotal, GIFT_LIST_LABEL } from "@/lib/gifts";
import { formatBDT } from "@/lib/money";

export default async function GiftsIndexPage() {
  const [biyer, babur] = await Promise.all([
    getGiftEntries("biyer"),
    getGiftEntries("babur"),
  ]);

  const cards = [
    {
      list: "biyer" as const,
      href: "/gifts/biyer",
      blurb: "Wedding gift register from the spreadsheet",
      gifts: biyer.filter((e) => e.kind === "gift"),
      cash: giftCashTotal(biyer),
    },
    {
      list: "babur" as const,
      href: "/gifts/babur",
      blurb: "Baby gift register from the spreadsheet",
      gifts: babur.filter((e) => e.kind === "gift"),
      cash: giftCashTotal(babur),
    },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Gift lists</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Separate from the monthly ledger — Biyer Gift and Babur Gift sheets.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.list} href={c.href} className="card block p-5 transition hover:border-[var(--primary)]">
            <p className="text-lg font-bold">{GIFT_LIST_LABEL[c.list]}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{c.blurb}</p>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-[var(--muted)]">{c.gifts.length} entries</span>
              <span className="font-bold tabular-nums">{formatBDT(c.cash)} cash</span>
            </div>
          </Link>
        ))}
      </div>

      {biyer.length === 0 && babur.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          No gift rows yet. Run{" "}
          <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs">supabase/gifts.sql</code>{" "}
          in Supabase, then{" "}
          <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs">npm run seed:google</code>.
        </p>
      ) : null}
    </div>
  );
}
