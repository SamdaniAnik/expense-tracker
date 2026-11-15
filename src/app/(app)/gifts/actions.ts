"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GiftList } from "@/lib/gifts";

function parseList(v: string): GiftList | null {
  return v === "biyer" || v === "babur" ? v : null;
}

export async function addGift(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const list = parseList(String(formData.get("list") ?? ""));
  if (!list) return { error: "Invalid gift list." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name." };

  const amountRaw = String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, "");
  const amount = amountRaw ? Number(amountRaw) : null;
  const item = String(formData.get("item") ?? "").trim() || null;

  if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
    return { error: "Amount must be a valid number." };
  }
  if (amount == null && !item) {
    return { error: "Enter an amount or an item." };
  }

  const { data: maxRow } = await supabase
    .from("gift_entries")
    .select("sort_order")
    .eq("list", list)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("gift_entries").insert({
    user_id: user.id,
    list,
    name,
    amount,
    item,
    kind: "gift",
    sort_order,
  });
  if (error) return { error: error.message };

  revalidatePath(`/gifts/${list}`);
  revalidatePath("/gifts");
  redirect(`/gifts/${list}`);
}

export async function deleteGift(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const list = parseList(String(formData.get("list") ?? ""));
  if (!id || !list) redirect("/gifts");

  await supabase.from("gift_entries").delete().eq("id", id);

  revalidatePath(`/gifts/${list}`);
  revalidatePath("/gifts");
  redirect(`/gifts/${list}`);
}
