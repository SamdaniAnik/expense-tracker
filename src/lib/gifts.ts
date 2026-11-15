import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type GiftList = "biyer" | "babur";
export type GiftKind = "gift" | "meta";

export interface GiftEntry {
  id: string;
  user_id: string;
  list: GiftList;
  name: string;
  amount: number | null;
  item: string | null;
  kind: GiftKind;
  sort_order: number;
  created_at: string;
}

export const GIFT_LIST_LABEL: Record<GiftList, string> = {
  biyer: "Biyer Gift",
  babur: "Babur Gift",
};

export const getGiftEntries = cache(async (list: GiftList): Promise<GiftEntry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_entries")
    .select("*")
    .eq("list", list)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    // Table may not exist yet before gifts.sql is run
    if (error.message.includes("gift_entries") || error.code === "42P01") {
      return [];
    }
    throw error;
  }
  return (data ?? []) as GiftEntry[];
});

export function giftCashTotal(entries: GiftEntry[]): number {
  return entries
    .filter((e) => e.kind === "gift" && e.amount != null)
    .reduce((s, e) => s + Number(e.amount), 0);
}

export function giftItemCount(entries: GiftEntry[]): number {
  return entries.filter((e) => e.kind === "gift" && (e.item || e.amount == null)).length;
}
