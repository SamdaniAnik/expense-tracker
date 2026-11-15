"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteCode } from "@/lib/household";

export async function createHousehold(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim() || "My household";
  const code = inviteCode();

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/household");

  const { data: hh, error } = await supabase
    .from("households")
    .insert({ name, invite_code: code, owner_id: user.id })
    .select("*")
    .single();
  if (error || !hh) redirect("/household");

  await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: user.id,
    role: "owner",
  });

  await supabase.from("accounts").update({ household_id: hh.id }).eq("user_id", user.id);
  await supabase.from("transactions").update({ household_id: hh.id }).eq("user_id", user.id);

  revalidatePath("/household");
  revalidatePath("/");
  redirect("/household");
}

export async function joinHousehold(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = String(formData.get("invite_code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) redirect("/household");

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/household");

  const { data: hh } = await supabase
    .from("households")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();
  if (!hh) redirect("/household");

  await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: user.id,
    role: "member",
  });

  revalidatePath("/household");
  revalidatePath("/");
  redirect("/household");
}

export async function leaveHousehold(_formData?: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role === "owner") redirect("/household");

  await supabase
    .from("household_members")
    .delete()
    .eq("household_id", membership.household_id)
    .eq("user_id", user.id);

  revalidatePath("/household");
  redirect("/household");
}

export async function dissolveHousehold(_formData?: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hh } = await supabase
    .from("households")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!hh) redirect("/household");

  await supabase.from("accounts").update({ household_id: null }).eq("household_id", hh.id);
  await supabase.from("transactions").update({ household_id: null }).eq("household_id", hh.id);
  await supabase.from("households").delete().eq("id", hh.id);

  revalidatePath("/household");
  redirect("/household");
}
