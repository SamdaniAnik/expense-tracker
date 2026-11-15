import Link from "next/link";
import { getAccounts, getTransactions, getTransactionsBefore } from "@/lib/data";
import { excelMonthSummary } from "@/lib/balances";
import { getExcelMonthSummary, getExcelYears } from "@/lib/month-summaries";
import { accountKeyFromName } from "@/lib/account-key";
import { formatBDT, formatBDTCompact, toCents, fromCents } from "@/lib/money";
import { getBudgets, budgetProgress } from "@/lib/budgets";
import { SectionTitle, AccountCard, Empty } from "@/components/ui";
import HomeMonthPicker from "@/components/HomeMonthPicker";
import HomeRecent from "@/components/HomeRecent";
import MonthCompare from "@/components/MonthCompare";
import type { Account, Transaction } from "@/lib/types";

function shiftYm(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthFlow(txns: Transaction[]) {
  let incomeP = 0;
  let expenseP = 0;
  for (const t of txns) {
    if (t.is_transfer) continue;
    const p = toCents(Number(t.amount) || 0);
    if (t.type === "income") incomeP += p;
    else expenseP += p;
  }
  return {
    income: fromCents(incomeP),
    expense: fromCents(expenseP),
    net: fromCents(incomeP - expenseP),
  };
}

function monthEndBalance(
  account: Account,
  monthTxns: Transaction[],
  sheetOpening: number | undefined,
): number {
  let cents =
    typeof sheetOpening === "number" ? toCents(sheetOpening) : toCents(account.opening_balance);
  for (const t of monthTxns) {
    if (t.account_id !== account.id) continue;
    cents += t.type === "income" ? toCents(Number(t.amount) || 0) : -toCents(Number(t.amount) || 0);
  }
  return fromCents(cents);
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
  const prevYm = shiftYm(ym, -1);
  const sheet = getExcelMonthSummary(ym);

  let accounts: Account[] = [];
  let monthTxns: Transaction[] = [];
  let priorTxns: Transaction[] = [];
  let prevTxns: Transaction[] = [];
  let budgets: Awaited<ReturnType<typeof getBudgets>> = [];
  let loadError: string | null = null;

  try {
    const results = await Promise.all([
      getAccounts(),
      getTransactions({ month: ym, lean: true }),
      sheet ? Promise.resolve([] as Transaction[]) : getTransactionsBefore(`${ym}-01`),
      getTransactions({ month: prevYm, lean: true }),
      getBudgets(),
    ]);
    accounts = results[0];
    monthTxns = results[1];
    priorTxns = results[2];
    prevTxns = results[3];
    budgets = results[4];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load data from Supabase.";
    console.error("Home load failed:", e);
  }

  const active = accounts.filter((a) => !a.archived);
  const excel = excelMonthSummary(
    active,
    sheet ? monthTxns : [...priorTxns, ...monthTxns],
    ym,
    sheet,
  );

  const recent = [...monthTxns].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  });

  const accountName = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const monthLabel = new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const prevLabel = new Date(prevYm + "-01T00:00:00").toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const years = getExcelYears();
  const addHref = `/add?m=${ym}`;
  const compareCurrent = monthFlow(monthTxns);
  const comparePrev = monthFlow(prevTxns);
  const budgetsNow = budgetProgress(budgets, monthTxns, ym).slice(0, 4);

  return (
    <div className="pb-2">
      {loadError ? (
        <div className="mb-4 rounded-xl border border-[var(--expense)] bg-[var(--expense-soft)] p-4 text-sm">
          <p className="font-semibold" style={{ color: "var(--expense)" }}>
            Couldn’t load live data
          </p>
          <p className="mt-1 text-[var(--muted)]">{loadError}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Run <code>supabase/fix-rls.sql</code> in the Supabase SQL editor, then reload.
          </p>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 rise sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Dashboard
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {monthLabel}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HomeMonthPicker month={ym} years={years} />
          <Link href={`/months?m=${ym}`} className="btn btn-ghost text-sm hidden sm:inline-flex">
            Full ledger
          </Link>
          <Link href={`/insights?y=${ym.slice(0, 4)}`} className="btn btn-ghost text-sm hidden sm:inline-flex">
            Reports
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-12">
        <div className="hero rise rise-1 overflow-hidden p-5 sm:p-6 lg:col-span-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Total balance
          </p>
          <p
            className="mt-2.5 font-display text-3xl font-extrabold tabular-nums tracking-tight sm:text-[2.75rem]"
            style={{ color: excel.closing < 0 ? "#fecdd3" : "#ffffff" }}
          >
            {formatBDT(excel.closing)}
          </p>
          <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-full bg-white/12 px-3 py-1.5 text-[0.7rem] font-medium tabular-nums text-white/85 backdrop-blur sm:text-xs">
            <span className="text-white/60">Open</span> {formatBDT(excel.opening)}
            <span className="text-emerald-200">+{formatBDT(excel.income)}</span>
            <span className="text-rose-200">−{formatBDT(excel.expense)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:col-span-7">
          <div
            className="card card-hover rise rise-2 flex min-w-0 flex-col justify-between overflow-hidden p-3 sm:p-4"
            style={{ background: "var(--income-soft)", borderColor: "color-mix(in srgb, var(--income) 30%, transparent)" }}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm leading-none sm:text-base" style={{ color: "var(--income)" }}>↑</span>
              <p className="truncate text-[0.65rem] font-bold uppercase tracking-wide sm:text-xs" style={{ color: "var(--income)" }}>
                Income
              </p>
            </div>
            <p className="mt-2 truncate text-sm font-extrabold tabular-nums sm:text-xl lg:text-2xl" style={{ color: "var(--income)" }}>
              <span className="sm:hidden">{formatBDTCompact(excel.income)}</span>
              <span className="hidden sm:inline">{formatBDT(excel.income)}</span>
            </p>
          </div>
          <div
            className="card card-hover rise rise-3 flex min-w-0 flex-col justify-between overflow-hidden p-3 sm:p-4"
            style={{ background: "var(--expense-soft)", borderColor: "color-mix(in srgb, var(--expense) 30%, transparent)" }}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm leading-none sm:text-base" style={{ color: "var(--expense)" }}>↓</span>
              <p className="truncate text-[0.65rem] font-bold uppercase tracking-wide sm:text-xs" style={{ color: "var(--expense)" }}>
                Expense
              </p>
            </div>
            <p className="mt-2 truncate text-sm font-extrabold tabular-nums sm:text-xl lg:text-2xl" style={{ color: "var(--expense)" }}>
              <span className="sm:hidden">{formatBDTCompact(excel.expense)}</span>
              <span className="hidden sm:inline">{formatBDT(excel.expense)}</span>
            </p>
          </div>
          <div className="card card-hover rise rise-4 flex min-w-0 flex-col justify-between overflow-hidden p-3 sm:p-4">
            <p className="truncate text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted)] sm:text-xs">
              Opening
            </p>
            <div className="min-w-0">
              <p className="mt-2 truncate text-sm font-extrabold tabular-nums sm:text-xl lg:text-2xl">
                <span className="sm:hidden">{formatBDTCompact(excel.opening)}</span>
                <span className="hidden sm:inline">{formatBDT(excel.opening)}</span>
              </p>
              <p className="truncate text-[0.6rem] text-[var(--faint)] sm:text-[0.65rem]">start of month</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <MonthCompare
          currentLabel={monthLabel}
          prevLabel={prevLabel}
          current={compareCurrent}
          previous={comparePrev}
        />
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Budgets
            </p>
            <Link href="/budgets" className="text-xs font-semibold text-[var(--primary)]">
              Manage
            </Link>
          </div>
          {budgetsNow.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No budgets yet.{" "}
              <Link href="/budgets" className="font-semibold text-[var(--primary)]">
                Set a limit
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {budgetsNow.map(({ budget, spent, pct, remaining }) => (
                <div key={budget.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">{budget.category}</span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {formatBDT(spent)} / {formatBDT(Number(budget.amount))}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: remaining < 0 ? "var(--expense)" : "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-12">
        <section className="min-w-0 lg:col-span-4">
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
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

        <section className="min-w-0 lg:col-span-8">
          <SectionTitle
            action={
              <Link href={`/months?m=${ym}`} className="text-xs font-semibold text-[var(--primary)]">
                Ledger view
              </Link>
            }
          >
            Recent · {monthLabel}
          </SectionTitle>
          <HomeRecent
            rows={recent}
            accountName={accountName}
            monthLabel={monthLabel}
            addHref={addHref}
          />
        </section>
      </div>
    </div>
  );
}
