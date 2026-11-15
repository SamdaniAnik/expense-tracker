import Link from "next/link";
import { getMyTourGroups } from "@/lib/tours";
import { SUPPORTED_CURRENCIES } from "@/lib/fx";
import { Empty } from "@/components/ui";
import { createTour, joinTour } from "./actions";

export default async function ToursPage() {
  const groups = await getMyTourGroups();

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Tours</h1>
        <p className="text-sm text-[var(--muted)]">
          Splitwise-style group expenses for trips with friends
        </p>
      </div>

      {groups.length === 0 ? (
        <Empty>No tours yet. Create one or join with an invite code.</Empty>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/tours/${g.id}`}
              className="card card-hover block p-4"
            >
              <p className="font-semibold">{g.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {g.base_currency} · code {g.invite_code}
              </p>
              {g.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{g.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={createTour} className="card space-y-3 p-4">
          <p className="text-sm font-bold">Create tour</p>
          <input name="name" className="input" placeholder="e.g. Cox’s Bazar 2026" required />
          <input name="description" className="input" placeholder="Optional description" />
          <select name="base_currency" className="input" defaultValue="BDT">
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="btn btn-primary w-full">Create</button>
        </form>

        <form action={joinTour} className="card space-y-3 p-4">
          <p className="text-sm font-bold">Join with code</p>
          <input
            name="invite_code"
            className="input font-mono uppercase tracking-widest"
            placeholder="ABCD1234"
            required
          />
          <button className="btn btn-ghost w-full">Join tour</button>
        </form>
      </div>
    </div>
  );
}
