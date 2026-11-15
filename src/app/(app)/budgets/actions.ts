"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function upsertBudget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""));
  const monthRaw = String(formData.get("month") ?? "").trim();
  const month = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : "";

  if (!category || !Number.isFinite(amount) || amount < 0) redirect("/budgets");

  await supabase.from("budgets").upsert(
    { user_id: user.id, category, amount, month },
    { onConflict: "user_id,category,month" },
  );

  revalidatePath("/budgets");
  revalidatePath("/");
  redirect("/budgets");
}

export async function deleteBudget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("budgets").delete().eq("id", id);

  revalidatePath("/budgets");
  revalidatePath("/");
  redirect("/budgets");
}
