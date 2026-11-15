"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "./icons";

/** Extra floating quick-add on pages that don't show the bottom-nav plus (desktop / deep pages). */
export default function QuickAddFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/add") || pathname.startsWith("/login")) return null;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="shell-desktop-fab pointer-events-none fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:bottom-8 lg:right-8">
      <Link
        href={`/transfer`}
        className="pointer-events-auto hidden rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold shadow-[var(--shadow-md)] lg:inline-flex"
      >
        Transfer
      </Link>
      <Link
        href={`/add?m=${month}`}
        aria-label="Quick add"
        className="pointer-events-auto hidden h-14 w-14 items-center justify-center rounded-full text-white lg:flex"
        style={{ background: "var(--grad-primary)", boxShadow: "var(--shadow-primary)" }}
      >
        <PlusIcon width={26} height={26} />
      </Link>
    </div>
  );
}
