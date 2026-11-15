"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Account } from "@/lib/types";

export default function TxFilters({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mb-3 space-y-2">
      <input
        type="search"
        placeholder="Search description…"
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)}
        className="input"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="month"
          defaultValue={params.get("month") ?? ""}
          onChange={(e) => update("month", e.target.value)}
          className="input"
        />
        <select
          defaultValue={params.get("account") ?? ""}
          onChange={(e) => update("account", e.target.value)}
          className="input"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
