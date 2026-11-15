"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Account, Transaction, TxType } from "@/lib/types";
import { guessCategory } from "@/lib/categories";

type Result = { error?: string } | void;

export default function TxForm({
  accounts,
  categories,
  initial,
  onSubmit,
  onDelete,
  submitLabel = "Save",
}: {
  accounts: Account[];
  categories: string[];
  initial?: Transaction;
  onSubmit: (formData: FormData) => Promise<Result>;
  onDelete?: () => Promise<Result>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(formData: FormData) {
    formData.set("type", type);
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(formData);
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  function handleDescBlur() {
    if (!category && description) setCategory(guessCategory(description));
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* income / expense toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-2)] p-1">
        <button
          type="button"
          onClick={() => setType("expense")}
          className="rounded-lg py-2.5 text-sm font-bold transition"
          style={{
            background: type === "expense" ? "var(--expense)" : "transparent",
            color: type === "expense" ? "#fff" : "var(--muted)",
          }}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className="rounded-lg py-2.5 text-sm font-bold transition"
          style={{
            background: type === "income" ? "var(--income)" : "transparent",
            color: type === "income" ? "#fff" : "var(--muted)",
          }}
        >
          Income
        </button>
      </div>

      <div>
        <label className="label" htmlFor="amount">Amount (৳)</label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          placeholder="0"
          defaultValue={initial ? String(initial.amount) : ""}
          className="input text-2xl font-bold tabular-nums"
          autoFocus={!initial}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="account_id">Account</label>
          <select id="account_id" name="account_id" defaultValue={initial?.account_id ?? accounts[0]?.id} className="input" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" name="date" type="date" defaultValue={initial?.date ?? today} className="input" required />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="e.g. Salary, Groceries, Uber"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescBlur}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="category">Category</label>
        <input
          id="category"
          name="category"
          list="category-list"
          placeholder="Optional"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        />
        <datalist id="category-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {error && <p className="text-sm text-[var(--expense)]">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost flex-1">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary flex-[2]" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => {
            if (!confirm("Delete this transaction?")) return;
            startTransition(async () => {
              const res = await onDelete();
              if (res && "error" in res && res.error) setError(res.error);
            });
          }}
          className="btn btn-danger w-full"
          disabled={pending}
        >
          Delete
        </button>
      )}
    </form>
  );
}
