"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function num(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "0").replace(/[^0-9.-]/g, "")) || 0;
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const type = String(formData.get("type") ?? "bank");
  await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    opening_balance: num(formData.get("opening_balance")),
    opening_date: String(formData.get("opening_date") ?? new Date().toISOString().slice(0, 10)),
  });
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("accounts")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      type: String(formData.get("type") ?? "bank"),
      opening_balance: num(formData.get("opening_balance")),
      opening_date: String(formData.get("opening_date") ?? ""),
    })
    .eq("id", id);
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function setArchived(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const archived = String(formData.get("archived") ?? "") === "true";
  if (!id) return;
  await supabase.from("accounts").update({ archived }).eq("id", id);
  revalidatePath("/accounts");
  revalidatePath("/");
}
