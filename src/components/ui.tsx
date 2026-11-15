import Link from "next/link";
import { formatBDT } from "@/lib/money";
import { ACCOUNT_TYPE_LABEL, type Account, type Transaction } from "@/lib/types";

export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "income" | "expense" | "neutral";
}) {
  const color =
    tone === "income"
      ? "var(--income)"
      : tone === "expense"
        ? "var(--expense)"
        : "var(--text)";
  const accent =
    tone === "income"
      ? "var(--income)"
      : tone === "expense"
        ? "var(--expense)"
        : "var(--primary)";
  return (
    <div className="card card-hover relative overflow-hidden p-3.5 pl-4">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="text-xs font-semibold text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-lg font-extrabold tabular-nums" style={{ color }}>
        {formatBDT(value)}
      </div>
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

const typeEmoji: Record<Account["type"], string> = {
  bank: "🏦",
  mobile: "📱",
  cash: "💵",
};

export function AccountCard({
  account,
  balance,
}: {
  account: Account;
  balance: number;
}) {
  return (
    <div className="card card-hover min-w-[9.5rem] flex-1 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-base ring-1 ring-[var(--border)]">
          {typeEmoji[account.type]}
        </span>
        <span className="truncate text-sm font-bold">{account.name}</span>
      </div>
      <div className="mt-3 text-xl font-extrabold tabular-nums" style={{ color: balance < 0 ? "var(--expense)" : "var(--text)" }}>
        {formatBDT(balance)}
      </div>
      <div className="mt-0.5 text-xs font-medium text-[var(--muted)]">{ACCOUNT_TYPE_LABEL[account.type]}</div>
    </div>
  );
}

function initials(s: string) {
  return (s || "?").trim().charAt(0).toUpperCase();
}

export function TxRow({
  tx,
  accountName,
}: {
  tx: Transaction;
  accountName: string;
}) {
  const income = tx.type === "income";
  return (
    <Link
      href={`/transactions/${tx.id}/edit`}
      className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold"
        style={{
          background: income ? "var(--income-soft)" : "var(--expense-soft)",
          color: income ? "var(--income)" : "var(--expense)",
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${
            income ? "var(--income)" : "var(--expense)"
          } 22%, transparent)`,
        }}
      >
        {initials(tx.description || tx.category || "?")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {tx.description || tx.category || "Transaction"}
        </div>
        <div className="truncate text-xs text-[var(--muted)]">
          {accountName}
          {tx.category ? ` · ${tx.category}` : ""}
        </div>
      </div>
      <div className="text-right">
        <div
          className="text-sm font-bold tabular-nums"
          style={{ color: income ? "var(--income)" : "var(--expense)" }}
        >
          {income ? "+" : "−"}
          {formatBDT(tx.amount).replace("৳", "৳")}
        </div>
        <div className="text-xs text-[var(--muted)]">{formatDay(tx.date)}</div>
      </div>
    </Link>
  );
}

function formatDay(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
