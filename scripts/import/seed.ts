/**
 * One-time history import. Idempotent: wipes the seed user's rows, then
 * re-inserts accounts + transactions parsed from data.ts.
 *
 * Run:  npm run seed
 * Needs env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { parseRows } from "./parse";
import { reconcile } from "./reconcile";
import { RAW_ROWS } from "./data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.SEED_USER_ID;

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!url || url.includes("placeholder")) die("Set NEXT_PUBLIC_SUPABASE_URL in .env.local");
if (!serviceKey || serviceKey.includes("placeholder")) die("Set SUPABASE_SERVICE_ROLE_KEY in .env.local");
if (!userId || userId.startsWith("0000")) die("Set SEED_USER_ID (your auth user id) in .env.local");

const supabase = createClient(url!, serviceKey!, {
  auth: { persistSession: false },
  // Node 20 has no global WebSocket; seed only needs REST, but the client still boots Realtime.
  realtime: { transport: ws as unknown as typeof WebSocket },
});

async function main() {
  const parsed = parseRows(RAW_ROWS);
  const { accounts, skipped } = parsed;
  const adjustments = reconcile(accounts, parsed.transactions);
  const transactions = [...parsed.transactions, ...adjustments];
  console.log(
    `Parsed ${accounts.length} accounts, ${parsed.transactions.length} transactions ` +
      `+ ${adjustments.length} reconciliation rows, ${skipped.length} skipped.`,
  );

  // wipe existing (idempotent re-run)
  await supabase.from("transactions").delete().eq("user_id", userId!);
  await supabase.from("accounts").delete().eq("user_id", userId!);

  // insert accounts, keep key -> id
  const keyToId = new Map<string, string>();
  for (const [i, a] of accounts.entries()) {
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: userId!,
        name: a.name,
        type: a.type,
        opening_balance: a.opening_balance,
        opening_date: a.opening_date,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) die(`Account insert failed (${a.name}): ${error.message}`);
    keyToId.set(a.key, data!.id);
    console.log(`  + account ${a.name} (opening ${a.opening_balance})`);
  }

  // insert transactions in chunks
  const rows = transactions.map((t) => ({
    user_id: userId!,
    account_id: keyToId.get(t.accountKey)!,
    date: t.date,
    type: t.type,
    amount: t.amount,
    description: t.description,
    category: t.category,
  }));

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("transactions").insert(slice);
    if (error) die(`Transaction insert failed at ${i}: ${error.message}`);
    console.log(`  inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length} rows (sample):`);
    for (const s of skipped.slice(0, 10)) {
      console.log(`  - ${s.reason}: ${s.row.account} ${s.row.date} ${s.row.desc}`);
    }
  }
  console.log("\n✓ Import complete.\n");
}

main().catch((e) => die(String(e)));
