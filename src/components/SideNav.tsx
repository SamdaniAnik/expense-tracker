"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, ChartIcon, WalletIcon, PlusIcon, GiftIcon } from "./icons";
import SignOutButton from "./SignOutButton";

const items = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/months",
    label: "Months",
    Icon: ListIcon,
    match: (p: string) => p.startsWith("/months") || p.startsWith("/transactions"),
  },
  {
    href: "/tours",
    label: "Tours",
    Icon: GiftIcon,
    match: (p: string) => p.startsWith("/tours"),
  },
  {
    href: "/insights",
    label: "Reports",
    Icon: ChartIcon,
    match: (p: string) => p.startsWith("/insights"),
  },
  {
    href: "/accounts",
    label: "Accounts",
    Icon: WalletIcon,
    match: (p: string) => p.startsWith("/accounts"),
  },
];

const more = [
  { href: "/budgets", label: "Budgets" },
  { href: "/transfer", label: "Transfer" },
  { href: "/recurring", label: "Recurring" },
  { href: "/debts", label: "Loans & debts" },
  { href: "/gifts", label: "Gifts" },
  { href: "/settings", label: "Settings" },
  { href: "/backup", label: "Backup" },
];

export default function SideNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const moreLinks = isAdmin
    ? [...more, { href: "/admin", label: "Admin" }]
    : more;

  return (
    <aside className="shell-side-nav sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-3.5 py-5 backdrop-blur lg:flex">
      <div className="mb-8 flex items-center gap-3 px-1.5">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl font-extrabold text-white"
          style={{ background: "var(--grad-primary)", boxShadow: "var(--shadow-primary)" }}
        >
          ৳
        </span>
        <div>
          <p className="font-display text-lg font-extrabold leading-none tracking-tight">Ledger</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Money & tours</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
              style={{
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--primary)" : "var(--text)",
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                  style={{ background: "var(--grad-primary)" }}
                  aria-hidden
                />
              )}
              <Icon width={18} height={18} />
              {label}
            </Link>
          );
        })}

        <p className="mb-1 mt-5 px-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--faint)]">
          More
        </p>
        {moreLinks.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
              style={{
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--primary)" : "var(--muted)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
        <Link href={`/add?m=${month}`} className="btn btn-primary w-full text-sm">
          <PlusIcon width={16} height={16} /> Add
        </Link>
        <SignOutButton />
      </div>
    </aside>
  );
}
