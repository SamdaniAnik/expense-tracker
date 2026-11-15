import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function esc(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

async function fetchAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  columns: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply?: (q: any) => any,
) {
  const pageSize = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (let from = 0; ; from += pageSize) {
    let q = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (apply) q = apply(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("y");
  const month = searchParams.get("m");
  const scope = searchParams.get("scope"); // all | bundle

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (scope === "bundle") {
      const [accounts, transactions, gifts, budgets, debts, recurring] = await Promise.all([
        fetchAll(supabase, "accounts", "*"),
        fetchAll(supabase, "transactions", "*"),
        fetchAll(supabase, "gift_entries", "*").catch(() => []),
        fetchAll(supabase, "budgets", "*").catch(() => []),
        fetchAll(supabase, "debts", "*").catch(() => []),
        fetchAll(supabase, "recurring_rules", "*").catch(() => []),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        accounts,
        transactions,
        gift_entries: gifts,
        budgets,
        debts,
        recurring_rules: recurring,
      };
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="ledger-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    const { data: accounts } = await supabase.from("accounts").select("id,name");
    const nameById = new Map((accounts ?? []).map((a) => [a.id as string, a.name as string]));

    const rows = await fetchAll(
      supabase,
      "transactions",
      "date,type,amount,description,category,note,tags,account_id,is_transfer",
      (q) => {
        let qq = q.order("date", { ascending: true });
        if (month && /^\d{4}-\d{2}$/.test(month)) {
          const [y, m] = month.split("-").map(Number);
          const start = `${month}-01`;
          const end =
            m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
          qq = qq.gte("date", start).lt("date", end);
        } else if (year && /^\d{4}$/.test(year)) {
          qq = qq.gte("date", `${year}-01-01`).lt("date", `${Number(year) + 1}-01-01`);
        } else if (scope !== "all" && !year && !month) {
          // default year export if nothing set — keep prior behavior via caller
        }
        return qq;
      },
    );

    const lines = [
      "date,type,amount,description,category,note,tags,account,is_transfer",
      ...rows.map((r) =>
        [
          r.date,
          r.type,
          r.amount,
          esc(r.description ?? ""),
          esc(r.category ?? ""),
          esc(r.note ?? ""),
          esc(Array.isArray(r.tags) ? r.tags.join("|") : ""),
          esc(nameById.get(r.account_id) ?? ""),
          r.is_transfer ? "1" : "0",
        ].join(","),
      ),
    ];

    const label = scope === "all" ? "all" : month || year || "export";
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger-${label}.csv"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
