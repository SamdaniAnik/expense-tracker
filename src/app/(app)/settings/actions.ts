"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_CURRENCIES } from "@/lib/fx";

export async function updateSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const display_name = String(formData.get("display_name") ?? "").trim();
  const display_currency = String(formData.get("display_currency") ?? "BDT").toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(display_currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    redirect("/settings");
  }

  await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: display_name || user.email?.split("@")[0] || "User",
      display_currency,
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/settings");
  revalidatePath("/");
  redirect("/settings");
}
