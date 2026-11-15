import Link from "next/link";
import { getAccounts, getTransactions, getTransactionsBefore } from "@/lib/data";
import { excelMonthSummary } from "@/lib/balances";
import { getExcelMonthSummary, getExcelYears } from "@/lib/month-summaries";
import { accountKeyFromName } from "@/lib/account-key";
import { formatBDT, toPaisa, fromPaisa } from "@/lib/money";
import { SectionTitle, AccountCard, TxRow, Empty } from "@/components/ui";
import HomeMonthPicker from "@/components/HomeMonthPicker";
import type { Account, Transaction } from "@/lib/types";

/** End-of-month balance without loading full history when Excel openings exist. */
function monthEndBalance(
  account: Account,
  monthTxns: Transaction[],
  sheetOpening: number | undefined,
): number {
  let paisa =
    typeof sheetOpening === "number" ? toPaisa(sheetOpening) : toPaisa(account.opening_balance);
  for (const t of monthTxns) {
    if (t.account_id !== account.id) continue;
    paisa += t.type === "income" ? toPaisa(t.amount) : -toPaisa(t.amount);
  }
  return fromPaisa(paisa);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : fallback;

  const sheet = getExcelMonthSummary(ym);
  // Fast path: this month only. If no Excel opening snapshot, also load prior rows once.
  const [accounts, monthTxns, priorTxns] = await Promise.all([
    getAccounts(),
    getTransactions({ month: ym, lean: true }),
    sheet ? Promise.resolve([]) : getTransactionsBefore(`${ym}-01`),
  ]);

  const active = accounts.filter((a) => !a.archived);
  const excel = excelMonthSummary(
    active,
    sheet ? monthTxns : [...priorTxns, ...monthTxns],
    ym,
    sheet,
  );

  const recent = [...monthTxns].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  );

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const monthLabel = new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const years = getExcelYears();
  const addHref = `/add?m=${ym}`;

  return (
    <div className="pb-2">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {monthLabel}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HomeMonthPicker month={ym} years={years} />
          <Link href={addHref} className="btn btn-primary text-sm lg:hidden">
            ＋ Add
          </Link>
          <Link href={`/months?m=${ym}`} className="btn btn-ghost text-sm hidden sm:inline-flex">
            Full ledger
          </Link>
          <Link href={`/insights?y=${ym.slice(0, 4)}`} className="btn btn-ghost text-sm hidden sm:inline-flex">
            Reports
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-12">
        <div
          className="card p-5 lg:col-span-5"
          style={{
            background: "linear-gradient(145deg, #fef9c3 0%, #fde68a 100%)",
            borderColor: "#facc15",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#854d0e" }}>
            Total balance
          </p>
          <p
            className="mt-2 text-3xl font-extrabold tabular-nums sm:text-4xl"
            style={{ color: excel.closing < 0 ? "#be123c" : "#121826" }}
          >
            {formatBDT(excel.closing)}
          </p>
          <p className="mt-2 text-xs" style={{ color: "#a16207" }}>
            Starting balances + income − expense
          </p>
          <p className="mt-3 text-xs tabular-nums" style={{ color: "#854d0e" }}>
            {formatBDT(excel.opening)} + {formatBDT(excel.income)} − {formatBDT(excel.expense)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:col-span-7">
          <div className="card p-4" style={{ background: "#ecfdf5", borderColor: "#a7f3d0" }}>
            <p className="text-xs font-semibold" style={{ color: "#047857" }}>
              Income
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl" style={{ color: "#047857" }}>
              {formatBDT(excel.income)}
            </p>
          </div>
          <div className="card p-4" style={{ background: "#fff1f2", borderColor: "#fecdd3" }}>
            <p className="text-xs font-semibold" style={{ color: "#be123c" }}>
              Expense
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl" style={{ color: "#be123c" }}>
              {formatBDT(excel.expense)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">Overall balance</p>
            <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">{formatBDT(excel.opening)}</p>
            <p className="text-[0.65rem] text-[var(--muted)]">start of month</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4">
          <SectionTitle
            action={
              <Link href="/accounts" className="text-xs font-semibold text-[var(--primary)]">
                Manage
              </Link>
            }
          >
            Accounts
          </SectionTitle>
          {active.length === 0 ? (
            <Empty>
              No accounts yet.{" "}
              <Link href="/accounts" className="font-semibold text-[var(--primary)]">
                Create one
              </Link>
              .
            </Empty>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-1">
              {active.map((a) => {
                const key = accountKeyFromName(a.name);
                const open = key ? sheet?.accounts?.[key] : undefined;
                return (
                  <AccountCard
                    key={a.id}
                    account={a}
                    balance={monthEndBalance(a, monthTxns, open)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-8">
          <SectionTitle
            action={
              <Link href={`/months?m=${ym}`} className="text-xs font-semibold text-[var(--primary)]">
                Ledger view
              </Link>
            }
          >
            Recent · {monthLabel}
          </SectionTitle>
          {recent.length === 0 ? (
            <Empty>
              No transactions in {monthLabel}.{" "}
              <Link href={addHref} className="font-semibold text-[var(--primary)]">
                Add one
              </Link>
              .
            </Empty>
          ) : (
            <>
              <div className="card divide-y divide-[var(--border)] overflow-hidden lg:hidden">
                {recent.slice(0, 40).map((t) => (
                  <TxRow key={t.id} tx={t} accountName={accountName.get(t.account_id) ?? "—"} />
                ))}
              </div>

              <div className="card hidden overflow-hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Description</th>
                        <th className="px-4 py-3 font-semibold">Account</th>
                        <th className="px-4 py-3 text-right font-semibold">Income</th>
                        <th className="px-4 py-3 text-right font-semibold">Expense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/70"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--muted)]">
                            <Link href={`/transactions/${t.id}/edit`} className="hover:text-[var(--primary)]">
                              {new Date(t.date + "T00:00:00").toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/transactions/${t.id}/edit`}
                              className="font-medium hover:text-[var(--primary)]"
                            >
                              {t.description || "—"}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
                            {accountName.get(t.account_id) ?? "—"}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right tabular-nums font-semibold"
                            style={{ color: "var(--income)" }}
                          >
                            {t.type === "income" ? formatBDT(t.amount) : ""}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right tabular-nums font-semibold"
                            style={{ color: "var(--expense)" }}
                          >
                            {t.type === "expense" ? formatBDT(t.amount) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {recent.length} entries · newest first
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
