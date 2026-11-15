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
            <div key={r.label} className="flex items-start justify-between gap-2 px-3 py-3 sm:items-center sm:gap-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="break-words text-xs text-[var(--muted)]">
                  Prev {formatBDT(r.prev)} → Now {formatBDT(r.cur)}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-1 text-[0.7rem] font-bold tabular-nums sm:px-2.5 sm:text-xs"
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
