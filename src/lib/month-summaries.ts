/**
 * Excel month footers / beginning balances captured by `npm run seed:google`.
 * Overall Balance in the sheet = starting balance of that month.
 * Yellow closing = starting + income − expense.
 */
import summaries from "@/data/month-summaries.json";

export interface MonthSummary {
  /** Sum of Beginning Balance rows (Excel Overall Balance column). */
  opening: number;
  income: number;
  expense: number;
  /** Yellow cell: opening + income − expense */
  closing: number;
  accounts?: Record<string, number>;
}

type SummaryMap = Record<string, MonthSummary>;

const MAP = summaries as SummaryMap;

export function getExcelMonthSummary(ym: string): MonthSummary | null {
  return MAP[ym] ?? null;
}

/** Years present in the imported Excel summaries (newest first). */
export function getExcelYears(): number[] {
  const years = new Set<number>();
  for (const ym of Object.keys(MAP)) {
    const y = Number(ym.slice(0, 4));
    if (Number.isFinite(y)) years.add(y);
  }
  const nowY = new Date().getFullYear();
  years.add(nowY);
  return [...years].sort((a, b) => b - a);
}

/** Closing balances from Excel summaries (chronological). */
export function getExcelBalanceSeries(limit = 24): { ym: string; closing: number }[] {
  const keys = Object.keys(MAP).sort();
  const slice = keys.slice(-limit);
  return slice.map((ym) => ({ ym, closing: MAP[ym].closing }));
}
