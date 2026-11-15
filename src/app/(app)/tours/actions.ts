"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteCode } from "@/lib/tours";
import { fromPaisa, toPaisa } from "@/lib/money";

export async function createTour(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const base_currency = String(formData.get("base_currency") ?? "BDT").toUpperCase();
  if (!name) redirect("/tours");

  const code = inviteCode();
  const { data: group, error } = await supabase
    .from("tour_groups")
    .insert({
      name,
      description,
      base_currency,
      invite_code: code,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error || !group) redirect("/tours");

  await supabase.from("tour_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/tours");
  redirect(`/tours/${group.id}`);
}

export async function joinTour(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = String(formData.get("invite_code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) redirect("/tours");

  // Lookup by invite code via service role (avoids exposing all groups via RLS)
  let group: { id: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tour_groups")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    group = data;
  } catch {
    const { data } = await supabase
      .from("tour_groups")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    group = data;
  }
  if (!group) redirect("/tours");

  const { data: existing } = await supabase
    .from("tour_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    // Insert as the joining user (policy allows user_id = auth.uid())
    await supabase.from("tour_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    });
  }

  revalidatePath("/tours");
  redirect(`/tours/${group.id}`);
}

export async function addGuest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group_id = String(formData.get("group_id") ?? "");
  const guest_name = String(formData.get("guest_name") ?? "").trim();
  if (!group_id || !guest_name) redirect(`/tours/${group_id || ""}`);

  await supabase.from("tour_members").insert({
    group_id,
    guest_name,
    role: "member",
  });

  revalidatePath(`/tours/${group_id}`);
  redirect(`/tours/${group_id}`);
}

export async function addTourExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group_id = String(formData.get("group_id") ?? "");
  const paid_by = String(formData.get("paid_by") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
  const currency = String(formData.get("currency") ?? "BDT").toUpperCase();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""));
  const split_type = String(formData.get("split_type") ?? "equal") as "equal" | "exact";
  const memberIds = formData.getAll("member_id").map(String);
  const exactRaw = formData.getAll("exact_amount").map(String);

  if (!group_id || !paid_by || !Number.isFinite(amount) || amount <= 0) {
    redirect(`/tours/${group_id}`);
  }

  const { data: members } = await supabase
    .from("tour_members")
    .select("id")
    .eq("group_id", group_id);
  const allIds = (members ?? []).map((m) => m.id as string);
  const included = memberIds.length ? memberIds.filter((id) => allIds.includes(id)) : allIds;
  if (!included.length) redirect(`/tours/${group_id}`);

  const { data: expense, error } = await supabase
    .from("tour_expenses")
    .insert({
      group_id,
      paid_by,
      amount,
      currency,
      description: description || "Expense",
      date,
      split_type,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error || !expense) redirect(`/tours/${group_id}`);

  let shares: { expense_id: string; member_id: string; owed_amount: number }[] = [];
  if (split_type === "exact") {
    const amounts = exactRaw.map((v) => Number(String(v).replace(/[^0-9.-]/g, "")) || 0);
    shares = included.map((member_id, i) => ({
      expense_id: expense.id,
      member_id,
      owed_amount: Math.round((amounts[i] || 0) * 100) / 100,
    }));
  } else {
    const n = included.length;
    const totalP = toPaisa(amount);
    const each = Math.floor(totalP / n);
    let rem = totalP - each * n;
    shares = included.map((member_id) => {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem -= 1;
      return {
        expense_id: expense.id,
        member_id,
        owed_amount: fromPaisa(each + extra),
      };
    });
  }

  await supabase.from("tour_shares").insert(shares);
  revalidatePath(`/tours/${group_id}`);
  redirect(`/tours/${group_id}`);
}

export async function addSettlement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group_id = String(formData.get("group_id") ?? "");
  const from_member = String(formData.get("from_member") ?? "");
  const to_member = String(formData.get("to_member") ?? "");
  const currency = String(formData.get("currency") ?? "BDT").toUpperCase();
  const note = String(formData.get("note") ?? "").trim() || null;
  const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^0-9.-]/g, ""));

  if (
    !group_id ||
    !from_member ||
    !to_member ||
    from_member === to_member ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    redirect(`/tours/${group_id}`);
  }

  await supabase.from("tour_settlements").insert({
    group_id,
    from_member,
    to_member,
    amount,
    currency,
    note,
    date,
    created_by: user.id,
  });

  revalidatePath(`/tours/${group_id}`);
  redirect(`/tours/${group_id}`);
}

export async function deleteTourExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const group_id = String(formData.get("group_id") ?? "");
  if (id) await supabase.from("tour_expenses").delete().eq("id", id);
  revalidatePath(`/tours/${group_id}`);
  redirect(`/tours/${group_id}`);
}
