import Link from "next/link";
import { getTransactionCount } from "@/lib/data";
import { SectionTitle } from "@/components/ui";

export default async function BackupPage() {
  const count = await getTransactionCount();

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Backup &amp; export</h1>
        <p className="text-sm text-[var(--muted)]">
          Download your ledger as CSV · {count.toLocaleString()} transactions
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href="/api/export?scope=all" className="card card-hover block p-5">
          <p className="font-semibold">Full ledger CSV</p>
          <p className="mt-1 text-sm text-[var(--muted)]">All transactions, all years</p>
        </a>
        <a href="/api/export?scope=bundle" className="card card-hover block p-5">
          <p className="font-semibold">Full backup bundle</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Accounts + transactions + gifts + budgets + debts
          </p>
        </a>
      </div>

      <SectionTitle>By year / month</SectionTitle>
      <div className="card space-y-3 p-4 sm:max-w-lg">
        <p className="text-sm text-[var(--muted)]">
          Use Reports → Export CSV for a year, or open a month ledger and filter Activity.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/insights" className="btn btn-ghost text-sm">
            Open Reports
          </Link>
          <Link href="/transactions" className="btn btn-ghost text-sm">
            Open Activity
          </Link>
        </div>
      </div>
    </div>
  );
}
