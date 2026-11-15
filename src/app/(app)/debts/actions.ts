"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createDebt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const kind = String(formData.get("kind") ?? "owe");
  const name = String(formData.get("name") ?? "").trim();
  const counterparty = String(formData.get("counterparty") ?? "").trim();
  const principal = Number(String(formData.get("principal") ?? "").replace(/[^0-9.-]/g, ""));
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if ((kind !== "owe" && kind !== "lent") || !name || !Number.isFinite(principal) || principal <= 0) {
    redirect("/debts");
  }

  await supabase.from("debts").insert({
    user_id: user.id,
    kind,
    name,
    counterparty,
    principal,
    remaining: principal,
    due_date,
    note,
  });

  revalidatePath("/debts");
  revalidatePath("/");
  redirect("/debts");
}

export async function payDebt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const pay = Number(String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""));
  if (!id || !Number.isFinite(pay) || pay <= 0) redirect("/debts");

  const { data: debt } = await supabase.from("debts").select("*").eq("id", id).maybeSingle();
  if (!debt) redirect("/debts");

  const remaining = Math.max(0, Number(debt.remaining) - pay);
  await supabase.from("debts").update({ remaining, settled: remaining <= 0 }).eq("id", id);

  revalidatePath("/debts");
  revalidatePath("/");
  redirect("/debts");
}

export async function settleDebt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("debts").update({ remaining: 0, settled: true }).eq("id", id);

  revalidatePath("/debts");
  redirect("/debts");
}

export async function deleteDebt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("debts").delete().eq("id", id);
  revalidatePath("/debts");
  redirect("/debts");
}
