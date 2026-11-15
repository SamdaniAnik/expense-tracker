"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Account, Transaction, TxType } from "@/lib/types";
import { guessCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";

type Result = { error?: string } | void;

export default function TxForm({
  accounts,
  categories,
  initial,
  defaultDate,
  returnTo,
  onSubmit,
  onDelete,
  submitLabel = "Save",
}: {
  accounts: Account[];
  categories: string[];
  initial?: Transaction;
  defaultDate?: string;
  returnTo?: string;
  onSubmit: (formData: FormData) => Promise<Result>;
  onDelete?: () => Promise<Result>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [receiptPath, setReceiptPath] = useState(initial?.receipt_path ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const dateValue = initial?.date ?? defaultDate ?? today;

  function handleSubmit(formData: FormData) {
    formData.set("type", type);
    formData.set("note", note);
    formData.set("tags", tags);
    if (receiptPath) formData.set("receipt_path", receiptPath);
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(formData);
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  function handleDescBlur() {
    if (!category && description) setCategory(guessCategory(description));
  }

  async function onReceiptChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required to upload.");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      setReceiptPath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={handleSubmit} className="card rise space-y-4 p-5 sm:max-w-xl">
      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
      <input type="hidden" name="receipt_path" value={receiptPath} />

      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--surface-2)] p-1">
        <button
          type="button"
          onClick={() => setType("expense")}
          className="rounded-lg py-2.5 text-sm font-bold transition-all"
          style={{
            background: type === "expense" ? "var(--expense)" : "transparent",
            color: type === "expense" ? "#fff" : "var(--muted)",
            boxShadow:
              type === "expense"
                ? "0 4px 12px -4px color-mix(in srgb, var(--expense) 60%, transparent)"
                : "none",
          }}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className="rounded-lg py-2.5 text-sm font-bold transition-all"
          style={{
            background: type === "income" ? "var(--income)" : "transparent",
            color: type === "income" ? "#fff" : "var(--muted)",
            boxShadow:
              type === "income"
                ? "0 4px 12px -4px color-mix(in srgb, var(--income) 60%, transparent)"
                : "none",
          }}
        >
          Income
        </button>
      </div>

      <div>
        <label className="label" htmlFor="amount">
          Amount (৳)
        </label>
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
          <label className="label" htmlFor="account_id">
            Account
          </label>
          <select
            id="account_id"
            name="account_id"
            defaultValue={initial?.account_id ?? accounts[0]?.id}
            className="input"
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">
            Date
          </label>
          <input id="date" name="date" type="date" defaultValue={dateValue} className="input" required />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
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
        <label className="label" htmlFor="category">
          Category
        </label>
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

      <div>
        <label className="label" htmlFor="tags">
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="comma separated · e.g. office, trip"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Optional details"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="receipt">
          Receipt
        </label>
        <input
          id="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="input"
          onChange={(e) => onReceiptChange(e.target.files?.[0] ?? null)}
          disabled={uploading}
        />
        {uploading ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Uploading…</p>
        ) : receiptPath ? (
          <p className="mt-1 text-xs text-[var(--income)]">Attached · {receiptPath.split("/").pop()}</p>
        ) : (
          <p className="mt-1 text-xs text-[var(--muted)]">Image or PDF (needs receipts bucket)</p>
        )}
      </div>

      {error && <p className="text-sm text-[var(--expense)]">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost flex-1">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary flex-[2]" disabled={pending || uploading}>
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
