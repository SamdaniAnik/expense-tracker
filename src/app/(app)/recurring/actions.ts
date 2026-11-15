"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyDueRecurring } from "@/lib/recurring";

export async function createRecurring(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account_id = String(formData.get("account_id") ?? "");
  const type = String(formData.get("type") ?? "expense");
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""));
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const day_of_month = Number(formData.get("day_of_month") ?? 1);

  if (
    !account_id ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (type !== "income" && type !== "expense") ||
    !Number.isInteger(day_of_month) ||
    day_of_month < 1 ||
    day_of_month > 28
  ) {
    redirect("/recurring");
  }

  await supabase.from("recurring_rules").insert({
    user_id: user.id,
    account_id,
    type,
    amount,
    description,
    category,
    day_of_month,
    active: true,
  });

  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function toggleRecurring(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (id) await supabase.from("recurring_rules").update({ active }).eq("id", id);
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function deleteRecurring(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("recurring_rules").delete().eq("id", id);
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function runRecurringNow() {
  const n = await applyDueRecurring();
  revalidatePath("/");
  revalidatePath("/months");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
  return { created: n };
}
