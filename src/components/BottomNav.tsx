"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, GiftIcon, WalletIcon, PlusIcon } from "./icons";

const items = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/months", label: "Months", Icon: ListIcon, match: (p: string) => p.startsWith("/months") || p.startsWith("/transactions") },
  { href: "/tours", label: "Tours", Icon: GiftIcon, match: (p: string) => p.startsWith("/tours") },
  { href: "/accounts", label: "Accounts", Icon: WalletIcon, match: (p: string) => p.startsWith("/accounts") || p.startsWith("/settings") },
];

export default function BottomNav() {
  const pathname = usePathname();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const addHref = `/add?m=${month}`;

  return (
    <nav
      className="shell-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-around px-2">
        {items.slice(0, 2).map(({ href, label, Icon, match }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} active={match(pathname)} />
        ))}

        <Link
          href={addHref}
          aria-label="Add transaction"
          className="relative -mt-7 flex items-center justify-center rounded-full text-white ring-4 ring-[var(--bg)] transition-transform active:scale-95"
          style={{ background: "var(--grad-primary)", boxShadow: "var(--shadow-primary)", height: "3.5rem", width: "3.5rem" }}
        >
          <PlusIcon width={26} height={26} />
        </Link>

        {items.slice(2).map(({ href, label, Icon, match }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} active={match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.68rem] font-semibold transition-colors"
      style={{ color: active ? "var(--primary)" : "var(--muted)" }}
    >
      {active && (
        <span
          className="absolute top-1 h-1 w-1 rounded-full"
          style={{ background: "var(--primary)" }}
          aria-hidden
        />
      )}
      <Icon />
      <span>{label}</span>
    </Link>
  );
}
