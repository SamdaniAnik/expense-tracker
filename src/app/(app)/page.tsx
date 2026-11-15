import Link from "next/link";
import { getAccounts, getAllTransactions, getTransactions } from "@/lib/data";
import { accountBalance, excelMonthSummary } from "@/lib/balances";
import { getExcelMonthSummary } from "@/lib/month-summaries";
import { formatBDT } from "@/lib/money";
import { SectionTitle, AccountCard, TxRow, Empty } from "@/components/ui";

export default async function DashboardPage() {
  const [accounts, txns, recent] = await Promise.all([
    getAccounts(),
    getAllTransactions(),
    getTransactions({ limit: 8 }),
  ]);

  const active = accounts.filter((a) => !a.archived);
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Yellow = all account starting balances + income − expense (Excel)
  const excel = excelMonthSummary(active, txns, ym, getExcelMonthSummary(ym));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--muted)]">Total balance · {monthLabel}</p>
          <p
            className="mt-1 inline-block rounded-lg px-2.5 py-1 text-3xl font-extrabold tabular-nums"
            style={{
              background: "#fef08a",
              color: excel.closing < 0 ? "var(--expense)" : "#121826",
            }}
            title="Starting balances of all accounts + Income − Expense"
          >
            {formatBDT(excel.closing)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            All starting balances + income − expense
          </p>
        </div>
        <Link
          href="/accounts"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-lg"
          aria-label="Accounts & settings"
        >
          ⚙️
        </Link>
      </header>

      {/* Same three figures as the sheet summary row */}
      <div className="mb-1 grid grid-cols-3 gap-2.5">
        <div
          className="card p-3.5"
          style={{ background: "#ecfdf5", borderColor: "#a7f3d0" }}
        >
          <div className="text-xs font-medium" style={{ color: "#047857" }}>
            Income
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums" style={{ color: "#047857" }}>
            {formatBDT(excel.income)}
          </div>
        </div>
        <div
          className="card p-3.5"
          style={{ background: "#fff1f2", borderColor: "#fecdd3" }}
        >
          <div className="text-xs font-medium" style={{ color: "#be123c" }}>
            Expense
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums" style={{ color: "#be123c" }}>
            {formatBDT(excel.expense)}
          </div>
        </div>
        <div className="card p-3.5">
          <div className="text-xs font-medium text-[var(--muted)]">Overall balance</div>
          <div className="mt-1 text-lg font-bold tabular-nums">{formatBDT(excel.opening)}</div>
          <div className="text-[0.65rem] text-[var(--muted)]">start of month</div>
        </div>
      </div>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Starting balances {formatBDT(excel.opening)} + Income {formatBDT(excel.income)} −
        Expense {formatBDT(excel.expense)} ={" "}
        <span className="font-semibold text-[var(--text)]">{formatBDT(excel.closing)}</span>
      </p>

      <div className="mb-4 text-right">
        <Link href={`/months?m=${ym}`} className="text-xs font-semibold text-[var(--primary)]">
          Open {monthLabel} ledger →
        </Link>
      </div>

      <SectionTitle action={<Link href="/accounts" className="text-xs font-semibold text-[var(--primary)]">Manage</Link>}>
        Accounts
      </SectionTitle>
      {active.length === 0 ? (
        <Empty>
          No accounts yet.{" "}
          <Link href="/accounts" className="font-semibold text-[var(--primary)]">Add one</Link>.
        </Empty>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {active.map((a) => (
            <AccountCard key={a.id} account={a} balance={accountBalance(a, txns)} />
          ))}
        </div>
      )}

      <SectionTitle action={<Link href="/months" className="text-xs font-semibold text-[var(--primary)]">By month</Link>}>
        Recent
      </SectionTitle>
      {recent.length === 0 ? (
        <Empty>
          Nothing logged yet. Tap <span className="font-semibold text-[var(--primary)]">＋</span> to add your first transaction.
        </Empty>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {recent.map((t) => (
            <TxRow key={t.id} tx={t} accountName={accountName.get(t.account_id) ?? "—"} />
          ))}
        </div>
      )}
    </div>
  );
}
