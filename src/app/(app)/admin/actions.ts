"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserRole(formData: FormData) {
  await requireAdmin().catch(() => redirect("/"));
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "user");
  if (!id || (role !== "user" && role !== "admin")) redirect("/admin");

  const admin = createAdminClient();
  await admin.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function setUserBanned(formData: FormData) {
  await requireAdmin().catch(() => redirect("/"));
  const id = String(formData.get("id") ?? "");
  const banned = String(formData.get("banned") ?? "") === "true";
  if (!id) redirect("/admin");

  const admin = createAdminClient();
  await admin.from("profiles").update({ banned, updated_at: new Date().toISOString() }).eq("id", id);

  if (banned) {
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    } catch {
      // ban_duration may vary by supabase version; profile.banned still gates app
    }
  } else {
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
    } catch {
      /* ignore */
    }
  }

  revalidatePath("/admin");
  redirect("/admin");
}
