import type { ParsedAccount, ParsedTx } from "./parse";

/** The sheet's reported OVERALL balance at these dates. Because the transcribed
 * rows are a best-effort subset of the full ledger, we add one labelled
 * adjustment per checkpoint so the running balance matches the real figures. */
export const BALANCE_CHECKPOINTS: { date: string; overall: number }[] = [
  { date: "2020-12-31", overall: 6619 },
  { date: "2021-12-31", overall: 18262 },
  { date: "2022-12-31", overall: 4082 },
  { date: "2023-12-31", overall: 2435 },
  { date: "2024-12-31", overall: 236165 },
  { date: "2025-12-31", overall: 78269 },
  { date: "2026-10-31", overall: 80186 },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Produce adjustment transactions so the overall balance hits each checkpoint. */
export function reconcile(
  accounts: ParsedAccount[],
  transactions: ParsedTx[],
  checkpoints = BALANCE_CHECKPOINTS,
): ParsedTx[] {
  const openingAt = (cut: string) =>
    accounts.reduce((s, a) => s + (a.opening_date <= cut ? a.opening_balance : 0), 0);

  const signedUpTo = (cut: string, extra: ParsedTx[]) =>
    [...transactions, ...extra].reduce(
      (s, t) => s + (t.date <= cut ? (t.type === "income" ? t.amount : -t.amount) : 0),
      0,
    );

  const adjustments: ParsedTx[] = [];
  for (const cp of [...checkpoints].sort((a, b) => a.date.localeCompare(b.date))) {
    const running = openingAt(cp.date) + signedUpTo(cp.date, adjustments);
    const diff = round2(cp.overall - running);
    if (Math.abs(diff) >= 1) {
      adjustments.push({
        accountKey: "SCB",
        date: cp.date,
        type: diff > 0 ? "income" : "expense",
        amount: Math.abs(diff),
        description: "Balance adjustment (history)",
        category: "Adjustment",
      });
    }
  }
  return adjustments;
}
