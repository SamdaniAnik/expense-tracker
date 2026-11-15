import { getAccounts, getAllTransactions } from "@/lib/data";
import { toPaisa, fromPaisa } from "@/lib/money";
import { Empty, SectionTitle } from "@/components/ui";
import { BalanceLine, IncomeExpenseBars, CategoryBars } from "@/components/charts/Charts";
import type { Transaction } from "@/lib/types";

function monthKey(date: string) {
  return date.slice(0, 7); // YYYY-MM
}
function shortMonth(ym: string) {
  return new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

export default async function InsightsPage() {
  const [accounts, txns] = await Promise.all([getAccounts(), getAllTransactions()]);

  if (txns.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">Insights</h1>
        <Empty>Add some transactions to see your charts.</Empty>
      </div>
    );
  }

  // --- monthly income/expense + net ---
  const byMonth = new Map<string, { income: number; expense: number }>();
  const catP = new Map<string, number>();
  for (const t of txns as Transaction[]) {
    const k = monthKey(t.date);
    const cur = byMonth.get(k) ?? { income: 0, expense: 0 };
    const p = toPaisa(t.amount);
    if (t.type === "income") cur.income += p;
    else {
      cur.expense += p;
      const c = t.category || "Other";
      catP.set(c, (catP.get(c) ?? 0) + p);
    }
    byMonth.set(k, cur);
  }

  const monthsSorted = [...byMonth.keys()].sort();
  const ieFull = monthsSorted.map((m) => {
    const v = byMonth.get(m)!;
    return { key: m, income: fromPaisa(v.income), expense: fromPaisa(v.expense) };
  });

  // cumulative balance over time
  const openingP = accounts.reduce((acc, a) => acc + toPaisa(a.opening_balance), 0);
  let running = openingP;
  const balanceFull = monthsSorted.map((m) => {
    const v = byMonth.get(m)!;
    running += v.income - v.expense;
    return { key: m, balance: fromPaisa(running) };
  });

  // last 12 months for the bar/line charts
  const ie = ieFull.slice(-12).map((d) => ({ month: shortMonth(d.key), income: d.income, expense: d.expense }));
  const balance = balanceFull.slice(-24).map((d) => ({ month: shortMonth(d.key), balance: d.balance }));

  // top spending categories (all-time)
  const cats = [...catP.entries()]
    .map(([name, p]) => ({ name, value: fromPaisa(p) }))
    .sort((a, b) => b.value - a.value);
  const topCats = cats.slice(0, 8);
  const rest = cats.slice(8).reduce((s, c) => s + c.value, 0);
  if (rest > 0) topCats.push({ name: "Other", value: rest });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Insights</h1>

      <SectionTitle>Balance over time</SectionTitle>
      <div className="card p-2">
        <BalanceLine data={balance} />
      </div>

      <SectionTitle>Income vs expense (12 mo)</SectionTitle>
      <div className="card p-2">
        <IncomeExpenseBars data={ie} />
      </div>

      <SectionTitle>Top spending categories</SectionTitle>
      <div className="card p-2">
        <CategoryBars data={topCats} />
      </div>
    </div>
  );
}
