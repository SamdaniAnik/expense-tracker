"use client";

import { useState, useTransition } from "react";
import { addGift } from "@/app/(app)/gifts/actions";
import type { GiftList } from "@/lib/gifts";

export default function GiftAddForm({ list }: { list: GiftList }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card space-y-3 p-4"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await addGift(fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <input type="hidden" name="list" value={list} />
      <p className="text-sm font-bold">Add entry</p>
      <div>
        <label className="label" htmlFor="gift-name">
          Name
        </label>
        <input id="gift-name" name="name" className="input" placeholder="Who gave the gift" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="gift-amount">
            Amount (৳)
          </label>
          <input
            id="gift-amount"
            name="amount"
            className="input"
            inputMode="decimal"
            placeholder="Optional if item"
          />
        </div>
        <div>
          <label className="label" htmlFor="gift-item">
            Item
          </label>
          <input id="gift-item" name="item" className="input" placeholder="e.g. Shari, Dress" />
        </div>
      </div>
      {error ? <p className="text-sm text-[var(--expense)]">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Add gift"}
      </button>
    </form>
  );
}
