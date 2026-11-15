import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Household } from "@/lib/types";

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const getMyHousehold = cache(async (): Promise<{
  household: Household | null;
  role: "owner" | "member" | null;
  memberCount: number;
}> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { household: null, role: null, memberCount: 0 };

    const { data: membership, error: memErr } = await supabase
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (memErr) return { household: null, role: null, memberCount: 0 };

    if (!membership) {
      const { data: owned } = await supabase
        .from("households")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!owned) return { household: null, role: null, memberCount: 0 };
      const { count } = await supabase
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("household_id", owned.id);
      return { household: owned as Household, role: "owner", memberCount: count ?? 1 };
    }

    const { data: household } = await supabase
      .from("households")
      .select("*")
      .eq("id", membership.household_id)
      .maybeSingle();

    const { count } = await supabase
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", membership.household_id);

    return {
      household: (household as Household) ?? null,
      role: membership.role as "owner" | "member",
      memberCount: count ?? 0,
    };
  } catch {
    return { household: null, role: null, memberCount: 0 };
  }
});

export { inviteCode };
