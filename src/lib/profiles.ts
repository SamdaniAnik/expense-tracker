import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { adminEmails, createAdminClient } from "@/lib/supabase/admin";

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  display_currency: string;
  banned: boolean;
  created_at: string;
  updated_at: string;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      // Table missing or profile not created yet — synthesize + try ensure
      await ensureProfile(user.id, user.email ?? "", user.user_metadata?.display_name);
      const retry = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (retry.data) return normalize(retry.data as Profile, user.email ?? "");
      return {
        id: user.id,
        email: user.email ?? "",
        display_name: (user.user_metadata?.display_name as string) || "User",
        role: adminEmails().includes((user.email ?? "").toLowerCase()) ? "admin" : "user",
        display_currency: "BDT",
        banned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const profile = normalize(data as Profile, user.email ?? "");
    // Bootstrap admin from env allowlist
    if (
      profile.role !== "admin" &&
      adminEmails().includes(profile.email.toLowerCase())
    ) {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
      profile.role = "admin";
    }
    return profile;
  } catch {
    return null;
  }
});

function normalize(p: Profile, emailFallback: string): Profile {
  return {
    ...p,
    email: p.email || emailFallback,
    display_name: p.display_name || "User",
    role: p.role === "admin" ? "admin" : "user",
    display_currency: p.display_currency || "BDT",
    banned: !!p.banned,
  };
}

export async function ensureProfile(
  userId: string,
  email: string,
  displayName?: string | null,
) {
  try {
    const admin = createAdminClient();
    const role = adminEmails().includes(email.toLowerCase()) ? "admin" : "user";
    await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        display_name: displayName || email.split("@")[0] || "User",
        role,
      },
      { onConflict: "id" },
    );
  } catch {
    // ignore if service role / table missing
  }
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    throw new Error("Admin access required");
  }
  return profile;
}
