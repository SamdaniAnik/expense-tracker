import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createAdminClient, adminEmails } from "@/lib/supabase/admin";
import { setUserBanned, setUserRole } from "./actions";

export default async function AdminPage() {
  const profile = await getProfile();
  const allow = adminEmails();
  const isAdmin =
    profile?.role === "admin" ||
    allow.includes((profile?.email ?? "").toLowerCase());
  if (!profile || profile.banned || !isAdmin) redirect("/");

  let users: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    banned: boolean;
    created_at: string;
  }[] = [];
  let stats = { users: 0, tours: 0, txns: 0 };

  try {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,email,display_name,role,banned,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    users = (profiles ?? []) as typeof users;

    const [u, t, x] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("tour_groups").select("*", { count: "exact", head: true }),
      admin.from("transactions").select("*", { count: "exact", head: true }),
    ]);
    stats = {
      users: u.count ?? users.length,
      tours: t.count ?? 0,
      txns: x.count ?? 0,
    };
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-extrabold">Admin</h1>
        <p className="mt-3 text-sm text-[var(--expense)]">
          {e instanceof Error ? e.message : "Admin client failed."} Ensure
          SUPABASE_SERVICE_ROLE_KEY is set and public-app.sql has been run.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          Admin
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          Control panel
        </h1>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Users" value={stats.users} />
        <Stat label="Tour groups" value={stats.tours} />
        <Stat label="Transactions" value={stats.txns} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <p className="text-sm font-bold">Users</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted)]">
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.display_name || "—"}</p>
                    <p className="text-xs text-[var(--muted)]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="dt-chip">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span style={{ color: "var(--expense)" }}>Banned</span>
                    ) : (
                      <span style={{ color: "var(--income)" }}>Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {u.id !== profile.id ? (
                        <>
                          <form action={setUserRole}>
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="role"
                              value={u.role === "admin" ? "user" : "admin"}
                            />
                            <button type="submit" className="btn btn-ghost text-xs">
                              {u.role === "admin" ? "Demote" : "Promote"}
                            </button>
                          </form>
                          <form action={setUserBanned}>
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="banned"
                              value={u.banned ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="text-xs font-semibold"
                              style={{ color: u.banned ? "var(--income)" : "var(--expense)" }}
                            >
                              {u.banned ? "Unban" : "Ban"}
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">You</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
