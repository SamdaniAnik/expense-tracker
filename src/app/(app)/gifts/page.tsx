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
      <div className="mb-6 rise">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Registers</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Gift lists</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          Separate from the monthly ledger — Biyer Gift and Babur Gift sheets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Link
            key={c.list}
            href={c.href}
            className={`card card-hover rise group block p-5 ${i === 1 ? "rise-1" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                style={{
                  background: "color-mix(in srgb, var(--primary) 12%, var(--surface))",
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              >
                🎁
              </span>
              <div>
                <p className="text-lg font-bold">{GIFT_LIST_LABEL[c.list]}</p>
                <p className="text-sm text-[var(--muted)]">{c.blurb}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
              <span className="pill">{c.gifts.length} entries</span>
              <span className="font-extrabold tabular-nums text-[var(--primary)]">
                {formatBDT(c.cash)} <span className="text-xs font-semibold text-[var(--muted)]">cash</span>
              </span>
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
