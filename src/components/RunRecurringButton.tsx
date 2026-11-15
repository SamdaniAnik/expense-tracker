"use client";

import { useState, useTransition } from "react";

export default function RunRecurringButton({
  action,
}: {
  action: () => Promise<{ created: number }>;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-ghost text-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await action();
            setMsg(
              res.created > 0
                ? `Posted ${res.created} transaction${res.created === 1 ? "" : "s"}`
                : "Nothing due",
            );
          })
        }
      >
        {pending ? "Running…" : "Post due now"}
      </button>
      {msg ? <p className="text-xs text-[var(--muted)]">{msg}</p> : null}
    </div>
  );
}
