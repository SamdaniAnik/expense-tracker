import { getMyHousehold } from "@/lib/household";
import { Empty, SectionTitle } from "@/components/ui";
import {
  createHousehold,
  dissolveHousehold,
  joinHousehold,
  leaveHousehold,
} from "./actions";

export default async function HouseholdPage() {
  const { household, role, memberCount } = await getMyHousehold();

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Household</h1>
        <p className="text-sm text-[var(--muted)]">
          Share accounts and transactions with family using an invite code
        </p>
      </div>

      {household ? (
        <div className="card mb-6 space-y-4 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Your household
            </p>
            <p className="mt-1 text-xl font-extrabold">{household.name}</p>
            <p className="text-sm text-[var(--muted)]">
              {memberCount} member{memberCount === 1 ? "" : "s"} · you are {role}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">Invite code</p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.2em]">
              {household.invite_code}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Share this code. The other person must already have a Ledger login.
            </p>
          </div>
          {role === "owner" ? (
            <form action={dissolveHousehold}>
              <button className="btn btn-danger w-full sm:w-auto">Dissolve household</button>
            </form>
          ) : (
            <form action={leaveHousehold}>
              <button className="btn btn-ghost w-full sm:w-auto">Leave household</button>
            </form>
          )}
        </div>
      ) : (
        <>
          <Empty>
            Not in a household yet. Create one or join with a code.
          </Empty>

          <SectionTitle>Create household</SectionTitle>
          <form action={createHousehold} className="card mb-6 space-y-3 p-4 sm:max-w-lg">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" placeholder="Family" defaultValue="Family" />
            </div>
            <button className="btn btn-primary w-full">Create &amp; get invite code</button>
          </form>

          <SectionTitle>Join with code</SectionTitle>
          <form action={joinHousehold} className="card space-y-3 p-4 sm:max-w-lg">
            <div>
              <label className="label">Invite code</label>
              <input
                name="invite_code"
                className="input font-mono uppercase tracking-widest"
                placeholder="ABCD1234"
                required
              />
            </div>
            <button className="btn btn-primary w-full">Join</button>
          </form>
        </>
      )}
    </div>
  );
}
