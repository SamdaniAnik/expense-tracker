"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseForm(formData: FormData) {
  const amount = Number(
    String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""),
  );
  return {
    account_id: String(formData.get("account_id") ?? ""),
    date: String(formData.get("date") ?? ""),
    type: String(formData.get("type") ?? "expense") as "income" | "expense",
    amount,
    description: String(formData.get("description") ?? "").trim(),
    category: (String(formData.get("category") ?? "").trim() || null) as string | null,
    note: (String(formData.get("note") ?? "").trim() || null) as string | null,
  };
}

function validate(v: ReturnType<typeof parseForm>) {
  if (!v.account_id) return "Pick an account.";
  if (!v.date) return "Pick a date.";
  if (!Number.isFinite(v.amount) || v.amount <= 0) return "Enter an amount greater than 0.";
  if (v.type !== "income" && v.type !== "expense") return "Pick income or expense.";
  return null;
}

export async function createTx(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parseForm(formData);
  const err = validate(v);
  if (err) return { error: err };

  const { error } = await supabase.from("transactions").insert({ ...v, user_id: user.id });
  if (error) return { error: error.message };

  const returnTo = String(formData.get("return_to") ?? "").trim();
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/months");
  redirect(returnTo.startsWith("/") ? returnTo : "/");
}

export async function updateTx(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parseForm(formData);
  const err = validate(v);
  if (err) return { error: err };

  const { error } = await supabase.from("transactions").update(v).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/months");
  const month = v.date.slice(0, 7);
  redirect(month ? `/months?m=${month}` : "/transactions");
}

export async function deleteTx(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("transactions")
    .select("date")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/months");
  const month = existing?.date ? String(existing.date).slice(0, 7) : "";
  redirect(month ? `/months?m=${month}` : "/transactions");
}
