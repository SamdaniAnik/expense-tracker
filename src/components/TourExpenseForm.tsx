"use client";

import { useMemo, useState } from "react";
import { addTourExpense } from "@/app/(app)/tours/actions";

type MemberOpt = { id: string; label: string };

export function TourExpenseForm({
  groupId,
  currency,
  today,
  members,
  defaultPayer,
}: {
  groupId: string;
  currency: string;
  today: string;
  members: MemberOpt[];
  defaultPayer: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  );
  const [splitType, setSplitType] = useState<"equal" | "exact">("equal");
  const [amount, setAmount] = useState("");
  const [exact, setExact] = useState<Record<string, string>>({});

  const selectedList = members.filter((m) => selected.has(m.id));
  const n = selectedList.length;

  const eachEqual = useMemo(() => {
    const a = Number(String(amount).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(a) || a <= 0 || n < 1) return null;
    return Math.round((a / n) * 100) / 100;
  }, [amount, n]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(members.map((m) => m.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  return (
    <form action={addTourExpense} className="card space-y-3 p-4">
      <p className="text-sm font-bold">Add expense</p>
      <p className="text-xs text-[var(--muted)]">
        Ticket for only some people? Uncheck the rest — cost splits among selected only.
      </p>
      <input type="hidden" name="group_id" value={groupId} />
      <input name="description" className="input" placeholder="What for? e.g. boat ride ×3" required />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="amount"
          inputMode="decimal"
          className="input"
          placeholder="Amount"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input name="currency" className="input" defaultValue={currency} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="date" type="date" className="input" defaultValue={today} />
        <select name="paid_by" className="input" required defaultValue={defaultPayer}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} paid
            </option>
          ))}
        </select>
      </div>
      <select
        name="split_type"
        className="input"
        value={splitType}
        onChange={(e) => setSplitType(e.target.value as "equal" | "exact")}
      >
        <option value="equal">Split equally among selected</option>
        <option value="exact">Custom amount per person</option>
      </select>

      <div className="space-y-2 rounded-xl bg-[var(--surface-2)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--muted)]">
            Split among · {n} of {members.length} selected
          </p>
          <div className="flex gap-2 text-[0.7rem] font-bold">
            <button type="button" className="text-[var(--primary)]" onClick={selectAll}>
              All
            </button>
            <button type="button" className="text-[var(--muted)]" onClick={selectNone}>
              None
            </button>
          </div>
        </div>

        {members.map((m) => {
          const on = selected.has(m.id);
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              style={{
                background: on ? "var(--surface)" : "transparent",
                opacity: on ? 1 : 0.55,
              }}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="member_id"
                  value={m.id}
                  checked={on}
                  onChange={() => toggle(m.id)}
                />
                <span className="truncate font-medium">{m.label}</span>
              </label>
              {splitType === "exact" && on ? (
                <input
                  name={`exact_${m.id}`}
                  inputMode="decimal"
                  className="input !w-24 py-1.5 text-sm"
                  placeholder="0"
                  value={exact[m.id] ?? ""}
                  onChange={(e) => setExact((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  required
                />
              ) : splitType === "equal" && on && eachEqual != null ? (
                <span className="text-xs font-semibold tabular-nums text-[var(--muted)]">
                  ≈ {eachEqual}
                </span>
              ) : null}
            </div>
          );
        })}

        {n === 0 ? (
          <p className="text-xs font-semibold text-[var(--expense)]">Select at least one person.</p>
        ) : splitType === "equal" && eachEqual != null ? (
          <p className="text-xs text-[var(--muted)]">
            Each of the {n} pays ≈ {eachEqual} {currency}
          </p>
        ) : null}
      </div>

      <button className="btn btn-primary w-full" disabled={n === 0}>
        Add expense
      </button>
    </form>
  );
}
