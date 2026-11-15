"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function createTransfer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const from_id = String(formData.get("from_account_id") ?? "");
  const to_id = String(formData.get("to_account_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!from_id || !to_id || from_id === to_id || !date || !Number.isFinite(amount) || amount <= 0) {
    redirect("/transfer");
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name")
    .in("id", [from_id, to_id]);
  const name = new Map((accounts ?? []).map((a) => [a.id as string, a.name as string]));
  const fromName = name.get(from_id) ?? "Account";
  const toName = name.get(to_id) ?? "Account";
  const group = randomUUID();

  const { error } = await supabase.from("transactions").insert([
    {
      user_id: user.id,
      account_id: from_id,
      date,
      type: "expense",
      amount,
      description: `Transfer to ${toName}`,
      category: "Transfer",
      note,
      transfer_group_id: group,
      is_transfer: true,
    },
    {
      user_id: user.id,
      account_id: to_id,
      date,
      type: "income",
      amount,
      description: `Transfer from ${fromName}`,
      category: "Transfer",
      note,
      transfer_group_id: group,
      is_transfer: true,
    },
  ]);

  if (error) redirect("/transfer");

  updateTag(`txns-${user.id}`);
  revalidatePath("/");
  revalidatePath("/months");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/insights");
  redirect(`/months?m=${date.slice(0, 7)}`);
}
