"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, GiftIcon, WalletIcon, PlusIcon } from "./icons";

const items = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/months", label: "Months", Icon: ListIcon, match: (p: string) => p.startsWith("/months") || p.startsWith("/transactions") },
  { href: "/gifts", label: "Gifts", Icon: GiftIcon, match: (p: string) => p.startsWith("/gifts") },
  { href: "/accounts", label: "Accounts", Icon: WalletIcon, match: (p: string) => p.startsWith("/accounts") },
];

export default function BottomNav() {
  const pathname = usePathname();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const addHref = `/add?m=${month}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-around px-2">
        {items.slice(0, 2).map(({ href, label, Icon, match }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} active={match(pathname)} />
        ))}

        <Link
          href={addHref}
          aria-label="Add transaction"
          className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-ink)] shadow-lg active:translate-y-px"
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
      className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.68rem] font-medium"
      style={{ color: active ? "var(--primary)" : "var(--muted)" }}
    >
      <Icon />
      <span>{label}</span>
    </Link>
  );
}
