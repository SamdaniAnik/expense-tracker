"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Account } from "@/lib/types";

export default function TxFilters({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get("q") ?? "";
      if (q === current) return;
      update("q", q);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div
      className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] sm:p-4"
      style={{ opacity: pending ? 0.75 : 1 }}
    >
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search description, note, category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input pl-9"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="label">Month</label>
          <input
            type="month"
            defaultValue={params.get("month") ?? ""}
            onChange={(e) => update("month", e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Account</label>
          <select
            defaultValue={params.get("account") ?? ""}
            onChange={(e) => update("account", e.target.value)}
            className="input"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
