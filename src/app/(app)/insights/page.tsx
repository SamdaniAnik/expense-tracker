import Link from "next/link";
import { getAccounts, getAllTransactions } from "@/lib/data";
import { toPaisa, fromPaisa, formatBDT } from "@/lib/money";
import { Empty, SectionTitle, StatTile } from "@/components/ui";
import { BalanceLine, IncomeExpenseBars, CategoryBars } from "@/components/charts/Charts";
import type { Transaction } from "@/lib/types";
import { getExcelYears } from "@/lib/month-summaries";

function monthKey(date: string) {
  return date.slice(0, 7);
}
function shortMonth(ym: string) {
  return new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const sp = await searchParams;
  const years = getExcelYears();
  const year =
    sp.y && /^\d{4}$/.test(sp.y) ? sp.y : String(years[0] ?? new Date().getFullYear());

  const [accounts, txns] = await Promise.all([getAccounts(), getAllTransactions()]);

  if (txns.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">Reports</h1>
        <Empty>Add some transactions to see reports.</Empty>
      </div>
    );
  }

  const yearTxns = (txns as Transaction[]).filter((t) => t.date.startsWith(year));
  const prevYear = String(Number(year) - 1);
  const prevTxns = (txns as Transaction[]).filter((t) => t.date.startsWith(prevYear));

  const byMonthAll = new Map<string, { income: number; expense: number }>();
  const byMonth = new Map<string, { income: number; expense: number }>();
  const catP = new Map<string, number>();
  const acctExp = new Map<string, number>();
  const acctInc = new Map<string, number>();
  const descExp = new Map<string, number>();

  let yearIncomeP = 0;
  let yearExpenseP = 0;

  for (const t of yearTxns) {
    const k = monthKey(t.date);
    const p = toPaisa(t.amount);
    const all = byMonthAll.get(k) ?? { income: 0, expense: 0 };
    if (t.type === "income") {
      all.income += p;
      yearIncomeP += p;
      acctInc.set(t.account_id, (acctInc.get(t.account_id) ?? 0) + p);
    } else {
      all.expense += p;
      yearExpenseP += p;
      acctExp.set(t.account_id, (acctExp.get(t.account_id) ?? 0) + p);
    }
    byMonthAll.set(k, all);

    if (t.category === "Adjustment") continue;
    const cur = byMonth.get(k) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += p;
    else {
      cur.expense += p;
      const c = t.category || "Other";
      catP.set(c, (catP.get(c) ?? 0) + p);
      const d = (t.description || "Other").trim() || "Other";
      descExp.set(d, (descExp.get(d) ?? 0) + p);
    }
    byMonth.set(k, cur);
  }

  let prevIncomeP = 0;
  let prevExpenseP = 0;
  for (const t of prevTxns) {
    const p = toPaisa(t.amount);
    if (t.type === "income") prevIncomeP += p;
    else prevExpenseP += p;
  }

  const monthsReal = [...byMonth.keys()].sort();
  const ie = monthsReal.map((m) => {
    const v = byMonth.get(m)!;
    return {
      month: shortMonth(m),
      income: fromPaisa(v.income),
      expense: fromPaisa(v.expense),
    };
  });

  const openingP = accounts.reduce((acc, a) => acc + toPaisa(a.opening_balance), 0);
  // Running balance across all history for the line chart (last 24 months)
  const byMonthAllLife = new Map<string, { income: number; expense: number }>();
  for (const t of txns as Transaction[]) {
    const k = monthKey(t.date);
    const p = toPaisa(t.amount);
    const all = byMonthAllLife.get(k) ?? { income: 0, expense: 0 };
    if (t.type === "income") all.income += p;
    else all.expense += p;
    byMonthAllLife.set(k, all);
  }
  const monthsAll = [...byMonthAllLife.keys()].sort();
  let running = openingP;
  const balance = monthsAll.slice(-24).map((m) => {
    const v = byMonthAllLife.get(m)!;
    running += v.income - v.expense;
    return { month: shortMonth(m), balance: fromPaisa(running) };
  });

  const cats = [...catP.entries()]
    .map(([name, p]) => ({ name, value: fromPaisa(p) }))
    .sort((a, b) => b.value - a.value);
  const topCats = cats.slice(0, 8);
  const rest = cats.slice(8).reduce((s, c) => s + c.value, 0);
  if (rest > 0) topCats.push({ name: "Other", value: rest });

  const topDesc = [...descExp.entries()]
    .map(([name, p]) => ({ name, value: fromPaisa(p) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byAccount = accounts
    .map((a) => ({
      name: a.name,
      income: fromPaisa(acctInc.get(a.id) ?? 0),
      expense: fromPaisa(acctExp.get(a.id) ?? 0),
    }))
    .filter((r) => r.income > 0 || r.expense > 0);

  const income = fromPaisa(yearIncomeP);
  const expense = fromPaisa(yearExpenseP);
  const net = fromPaisa(yearIncomeP - yearExpenseP);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : 0;
  const avgExpense =
    monthsReal.length > 0 ? fromPaisa(Math.round(yearExpenseP / monthsReal.length)) : 0;

  const prevNet = fromPaisa(prevIncomeP - prevExpenseP);
  const netDelta = net - prevNet;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Reports</h1>
          <p className="text-sm text-[var(--muted)]">
            {yearTxns.length.toLocaleString()} transactions in {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {years.slice(0, 8).map((y) => (
              <Link
                key={y}
                href={`/insights?y=${y}`}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                style={{
                  background: String(y) === year ? "var(--primary)" : "var(--surface-2)",
                  color: String(y) === year ? "var(--primary-ink)" : "var(--text)",
                }}
              >
                {y}
              </Link>
            ))}
          </div>
          <a href={`/api/export?y=${year}`} className="btn btn-ghost text-sm">
            Export CSV
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={`${year} income`} value={income} tone="income" />
        <StatTile label={`${year} expense`} value={expense} tone="expense" />
        <StatTile label={`${year} net`} value={net} tone={net < 0 ? "expense" : "income"} />
        <div className="card p-3.5">
          <div className="text-xs font-medium text-[var(--muted)]">Savings rate</div>
          <div
            className="mt-1 text-lg font-bold tabular-nums"
            style={{ color: savingsRate < 0 ? "var(--expense)" : "var(--income)" }}
          >
            {savingsRate}%
          </div>
          <div className="text-[0.65rem] text-[var(--muted)]">
            vs {prevYear} net {netDelta >= 0 ? "+" : ""}
            {formatBDT(netDelta)}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">Avg monthly expense</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatBDT(avgExpense)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">Active months</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{monthsReal.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">{prevYear} expense</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatBDT(fromPaisa(prevExpenseP))}</p>
        </div>
      </div>

      <SectionTitle>Balance over time (24 mo)</SectionTitle>
      <div className="card p-2">
        <BalanceLine data={balance} />
      </div>

      <SectionTitle>Income vs expense · {year}</SectionTitle>
      <div className="card p-2">
        {ie.length === 0 ? (
          <Empty>No activity in {year}.</Empty>
        ) : (
          <IncomeExpenseBars data={ie} />
        )}
      </div>

      <div className="mt-2 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Top categories · {year}</SectionTitle>
          <div className="card p-2">
            {topCats.length === 0 ? (
              <Empty>No categorized expenses.</Empty>
            ) : (
              <CategoryBars data={topCats} />
            )}
          </div>
        </div>
        <div>
          <SectionTitle>By account · {year}</SectionTitle>
          <div className="card overflow-hidden">
            {byAccount.length === 0 ? (
              <Empty>No account activity.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase text-[var(--muted)]">
                    <th className="px-3 py-2.5">Account</th>
                    <th className="px-3 py-2.5 text-right">In</th>
                    <th className="px-3 py-2.5 text-right">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {byAccount.map((r) => (
                    <tr key={r.name} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-3 py-2.5 font-medium">{r.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--income)" }}>
                        {formatBDT(r.income)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--expense)" }}>
                        {formatBDT(r.expense)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <SectionTitle>Largest expenses · {year}</SectionTitle>
      <div className="card overflow-hidden">
        {topDesc.length === 0 ? (
          <Empty>No expenses.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase text-[var(--muted)]">
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {topDesc.map((r) => (
                <tr key={r.name} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{r.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: "var(--expense)" }}>
                    {formatBDT(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Loaded {txns.length.toLocaleString()} rows from Supabase (cached).{" "}
        <Link href={`/months`} className="font-semibold text-[var(--primary)]">
          Open month ledger
        </Link>
      </p>
    </div>
  );
}
