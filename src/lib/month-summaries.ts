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
