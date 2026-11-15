import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("y");
  const month = searchParams.get("m");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accounts } = await supabase.from("accounts").select("id,name");
  const nameById = new Map((accounts ?? []).map((a) => [a.id as string, a.name as string]));

  const pageSize = 1000;
  const rows: {
    date: string;
    type: string;
    amount: number;
    description: string | null;
    category: string | null;
    account_id: string;
  }[] = [];

  for (let from = 0; ; from += pageSize) {
    let q = supabase
      .from("transactions")
      .select("date,type,amount,description,category,account_id")
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const start = `${month}-01`;
      const end =
        m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      q = q.gte("date", start).lt("date", end);
    } else if (year && /^\d{4}$/.test(year)) {
      q = q.gte("date", `${year}-01-01`).lt("date", `${Number(year) + 1}-01-01`);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows.push(...((data as typeof rows) ?? []));
    if (!data || data.length < pageSize) break;
  }

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    "date,type,amount,description,category,account",
    ...rows.map((r) =>
      [
        r.date,
        r.type,
        r.amount,
        esc(r.description ?? ""),
        esc(r.category ?? ""),
        esc(nameById.get(r.account_id) ?? ""),
      ].join(","),
    ),
  ];

  const label = month || year || "all";
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paisa-${label}.csv"`,
    },
  });
}
