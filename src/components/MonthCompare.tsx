import { formatBDT } from "@/lib/money";

export default function MonthCompare({
  currentLabel,
  prevLabel,
  current,
  previous,
}: {
  currentLabel: string;
  prevLabel: string;
  current: { income: number; expense: number; net: number };
  previous: { income: number; expense: number; net: number };
}) {
  const rows: { label: string; cur: number; prev: number; invert?: boolean }[] = [
    { label: "Income", cur: current.income, prev: previous.income },
    { label: "Expense", cur: current.expense, prev: previous.expense, invert: true },
    { label: "Net", cur: current.net, prev: previous.net },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Month compare
        </p>
        <p className="text-sm font-semibold">
          {currentLabel} vs {prevLabel}
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {rows.map((r) => {
          const delta = r.cur - r.prev;
          const better = r.invert ? delta <= 0 : delta >= 0;
          return (
            <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  Prev {formatBDT(r.prev)} → Now {formatBDT(r.cur)}
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold tabular-nums"
                style={{
                  background: better ? "var(--income-soft)" : "var(--expense-soft)",
                  color: better ? "var(--income)" : "var(--expense)",
                }}
              >
                {delta >= 0 ? "+" : ""}
                {formatBDT(delta)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
