"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, ChartIcon, WalletIcon, PlusIcon } from "./icons";
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
    href: "/insights",
    label: "Insights",
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

export default function SideNav() {
  const pathname = usePathname();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 lg:flex">
      <div className="mb-8 px-2">
        <p className="text-lg font-extrabold tracking-tight">Paisa</p>
        <p className="text-xs text-[var(--muted)]">Personal finance</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
              style={{
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--primary)" : "var(--text)",
              }}
            >
              <Icon width={18} height={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href={`/add?m=${month}`}
        className="btn btn-primary mb-3 w-full"
      >
        <PlusIcon width={18} height={18} />
        Add transaction
      </Link>
      <div className="px-1">
        <SignOutButton />
      </div>
    </aside>
  );
}
