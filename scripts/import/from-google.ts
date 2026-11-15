/**
 * Download the Google Sheet workbook (or reuse a local copy), parse every
 * monthly tab into RawRows, wipe the seed user, and re-insert.
 *
 * Run:  npm run seed:google
 *
 * Optional: GOOGLE_SHEET_ID / GOOGLE_SHEET_GID (defaults to the owner's ledger)
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import ws from "ws";
import * as XLSX from "xlsx";
import { parseRows, resolveAccount, parseMoney, type RawRow } from "./parse";

const XLSX_PATH = join(process.cwd(), "scripts", "import", "google-sheet.xlsx");

const SHEET_ID =
  process.env.GOOGLE_SHEET_ID ?? "12h9YGdQJQ-nOmdlgtVEMn9IAcAkJXSg6";

const SKIP_SHEETS = new Set([
  "Credit Card Cashback",
  "Biyer Gift",
  "Babur Gift",
]);

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

async function downloadWorkbook(): Promise<Buffer> {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
  console.log(`Downloading workbook ${SHEET_ID}…`);
  const res = await fetch(exportUrl);
  if (!res.ok) {
    die(
      `Could not download sheet (HTTP ${res.status}). Make sure sharing is ` +
        `"Anyone with the link → Viewer".`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(join(process.cwd(), "scripts", "import"), { recursive: true });
  writeFileSync(XLSX_PATH, buf);
  console.log(`  saved ${XLSX_PATH} (${buf.length} bytes)`);
  return buf;
}

function sheetYear(name: string): number | null {
  const m = name.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

/** Day-first before 2025 (sheet convention); month-first from 2025. */
function normalizeSheetDate(s: string, yearHint: number | null): string | null {
  if (!s) return null;
  const iso = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  // Excel serial (if raw slipped through)
  if (/^\d+(\.\d+)?$/.test(iso)) {
    const n = Number(iso);
    if (n > 20000 && n < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + Math.floor(n));
      return epoch.toISOString().slice(0, 10);
    }
  }

  const slash = iso.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!slash) return null;
  let a = Number(slash[1]);
  let b = Number(slash[2]);
  let year = Number(slash[3]);
  if (year < 100) year += 2000;

  let day: number;
  let month: number;
  const dayFirst = (yearHint ?? year) < 2025;
  if (a > 12) {
    day = a;
    month = b;
  } else if (b > 12) {
    month = a;
    day = b;
  } else if (dayFirst) {
    day = a;
    month = b;
  } else {
    month = a;
    day = b;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function guessAccountFromText(...parts: string[]): string | null {
  const blob = parts.join(" ");
  const hit = resolveAccount(blob);
  if (hit) return hit.key;
  // looser tokens commonly used in the Description column
  if (/bkash|bikash/i.test(blob)) return "BKASH";
  if (/nagad/i.test(blob)) return "NAGAD";
  if (/\bcash\b/i.test(blob)) return "CASH";
  if (/\bscb\b|standard chartered|trust bank|brac/i.test(blob)) return "SCB";
  return null;
}

function accountLabel(key: string): string {
  return (
    {
      SCB: "SCB",
      BKASH: "BKASH",
      NAGAD: "NAGAD",
      CASH: "CASH",
    } as Record<string, string>
  )[key];
}

function isBeginRow(
  accountCell: string,
  descCell: string,
  incomeCell: string,
  expenseCell: string,
): boolean {
  const a = accountCell.toLowerCase();
  const d = descCell.toLowerCase();
  if (/beginning balance/.test(d) || /beginning balance/.test(a)) return true;
  const noMovement = !incomeCell && !expenseCell;
  // Opening rows like Cash / "Cash in hand" or Nagad / "Nagad"
  if (
    noMovement &&
    resolveAccount(accountCell) &&
    (/^cash in hand$/i.test(descCell) || /^nagad$/i.test(descCell))
  ) {
    return true;
  }
  return false;
}

function parseWorkbook(buf: Buffer): RawRow[] {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const out: RawRow[] = [];
  let skipped = 0;

  for (const name of wb.SheetNames) {
    if (SKIP_SHEETS.has(name)) continue;
    const yearHint = sheetYear(name);
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[name], {
      header: 1,
      defval: "",
      raw: false,
    });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(12, rows.length); i++) {
      const cells = rows[i].map((c) => String(c).toLowerCase());
      if (cells.some((c) => c === "account" || c.startsWith("account")) && cells.includes("date")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) continue;

    const header = rows[headerIdx].map((c) => String(c).toLowerCase());
    const col = {
      account: header.findIndex((c) => c.includes("account") && !c.includes("balance")),
      date: header.findIndex((c) => c === "date"),
      desc: header.findIndex((c) => c.includes("description")),
      income: header.findIndex((c) => c.includes("income")),
      expense: header.findIndex((c) => c.includes("expense")),
      acctBal: header.findIndex((c) => c.includes("account balance")),
      overall: header.findIndex((c) => c.includes("overall")),
    };
    if (col.account < 0 || col.date < 0) continue;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r.some((c) => String(c).trim() !== "")) continue;

      const accountCell = String(r[col.account] ?? "").trim();
      const dateCell = String(r[col.date] ?? "").trim();
      const descCell = String(r[col.desc] ?? "").trim();
      const incomeCell = String(r[col.income] ?? "").trim();
      const expenseCell = String(r[col.expense] ?? "").trim();
      const balCell = String(
        r[col.acctBal >= 0 ? col.acctBal : col.overall] ?? "",
      ).trim();

      if (!accountCell && !descCell && !dateCell) continue;

      const date = normalizeSheetDate(dateCell, yearHint);
      if (!date) {
        skipped++;
        continue;
      }

      if (isBeginRow(accountCell, descCell, incomeCell, expenseCell)) {
        const acc =
          resolveAccount(accountCell)?.key ??
          guessAccountFromText(accountCell, descCell);
        if (!acc) {
          skipped++;
          continue;
        }
        const amount = parseMoney(balCell || incomeCell || expenseCell);
        out.push({
          account: accountLabel(acc),
          date,
          desc: "Beginning Balance",
          amount: Number.isFinite(amount) ? amount : 0,
          kind: "begin",
        });
        continue;
      }

      // 2025+ tabs put description in Account col and account in Description col.
      let accountKey: string | null = null;
      let description = descCell;

      const accFrom0 = resolveAccount(accountCell)?.key ?? null;
      const accFromDesc = resolveAccount(descCell)?.key ?? null;

      if (accFromDesc && !accFrom0) {
        accountKey = accFromDesc;
        description = accountCell;
      } else if (accFrom0 && !accFromDesc) {
        accountKey = accFrom0;
        description = descCell || accountCell;
      } else if (accFrom0 && accFromDesc) {
        // Prefer the Description column when it looks like a short account token
        // (SCB / BKASH) and Account column is a longer phrase.
        if (descCell.length <= 24 && accountCell.length > descCell.length) {
          accountKey = accFromDesc;
          description = accountCell;
        } else {
          accountKey = accFrom0;
          description = descCell;
        }
      } else {
        accountKey = guessAccountFromText(accountCell, descCell);
        description = accountCell || descCell;
        // default remaining ledger noise to SCB (matches historical sheet usage)
        if (!accountKey && (incomeCell || expenseCell)) accountKey = "SCB";
      }

      if (!accountKey) {
        skipped++;
        continue;
      }

      const income = parseMoney(incomeCell);
      const expense = parseMoney(expenseCell);

      if (Number.isFinite(income) && income > 0) {
        out.push({
          account: accountLabel(accountKey),
          date,
          desc: description || "Income",
          amount: income,
          kind: "in",
        });
      }
      if (Number.isFinite(expense) && expense > 0) {
        out.push({
          account: accountLabel(accountKey),
          date,
          desc: description || "Expense",
          amount: expense,
          kind: "out",
        });
      }
      if (
        !(Number.isFinite(income) && income > 0) &&
        !(Number.isFinite(expense) && expense > 0)
      ) {
        skipped++;
      }
    }
  }

  console.log(`Parsed ${out.length} raw rows from sheet (${skipped} skipped).`);
  return out;
}

export interface MonthSummary {
  opening: number;
  income: number;
  expense: number;
  closing: number;
  accounts: Record<string, number>;
}

/** Pull Excel beginning balances + footer totals per month (yellow = closing). */
function extractMonthSummaries(buf: Buffer): Record<string, MonthSummary> {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const out: Record<string, MonthSummary> = {};

  for (const name of wb.SheetNames) {
    if (SKIP_SHEETS.has(name)) continue;
    const yearHint = sheetYear(name);
    if (!yearHint) continue;

    // "November 2026" → 2026-11
    const monthName = name.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})$/i,
    );
    if (!monthName) continue;
    const monthNum =
      [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ].indexOf(monthName[1].toLowerCase()) + 1;
    const ym = `${monthName[2]}-${String(monthNum).padStart(2, "0")}`;

    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[name], {
      header: 1,
      defval: "",
      raw: false,
    });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(12, rows.length); i++) {
      const cells = rows[i].map((c) => String(c).toLowerCase());
      if (cells.some((c) => c.includes("account")) && cells.includes("date")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) continue;

    const header = rows[headerIdx].map((c) => String(c).toLowerCase());
    const col = {
      account: header.findIndex((c) => c.includes("account") && !c.includes("balance")),
      date: header.findIndex((c) => c === "date"),
      desc: header.findIndex((c) => c.includes("description")),
      income: header.findIndex((c) => c.includes("income")),
      expense: header.findIndex((c) => c.includes("expense")),
      overall: header.findIndex(
        (c) => c.includes("overall") || c.includes("account balance"),
      ),
    };

    const accounts: Record<string, number> = {};
    let openingFromBegins = 0;

    for (let i = headerIdx + 1; i < Math.min(headerIdx + 20, rows.length); i++) {
      const r = rows[i];
      if (!r) continue;
      const accountCell = String(r[col.account] ?? "").trim();
      const descCell = String(r[col.desc] ?? "").trim();
      const incomeCell = String(r[col.income] ?? "").trim();
      const expenseCell = String(r[col.expense] ?? "").trim();
      const balCell = String(r[col.overall] ?? "").trim();
      if (!isBeginRow(accountCell, descCell, incomeCell, expenseCell)) continue;
      const acc =
        resolveAccount(accountCell)?.key ?? guessAccountFromText(accountCell, descCell);
      if (!acc) continue;
      const amount = parseMoney(balCell);
      if (!Number.isFinite(amount)) continue;
      accounts[acc] = amount;
      openingFromBegins += amount;
    }

    // Footer rows: blank identity cols + numbers in income/expense/overall
    type Footer = { income: number; expense: number; overall: number; closingOnly?: number };
    const footers: Footer[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const a = String(r[col.account] ?? "").trim();
      const b = String(r[col.date] ?? "").trim();
      const c = String(r[col.desc] ?? "").trim();
      const inc = parseMoney(String(r[col.income] ?? ""));
      const exp = parseMoney(String(r[col.expense] ?? ""));
      const ov = parseMoney(String(r[col.overall] ?? ""));
      if (a || b || c) continue;
      if (!Number.isFinite(ov) && !Number.isFinite(inc) && !Number.isFinite(exp)) continue;
      footers.push({
        income: Number.isFinite(inc) && inc > 0 ? inc : 0,
        expense: Number.isFinite(exp) && exp > 0 ? exp : 0,
        overall: Number.isFinite(ov) ? ov : 0,
      });
    }

    // First footer with income+expense = month totals + starting overall in Overall Balance col
    const totalsRow = footers.find((f) => f.income > 0 || f.expense > 0);
    // Last footer that is overall-only (or last overall) ≈ yellow closing
    const closingRow = [...footers].reverse().find((f) => f.overall > 0 && f.income === 0 && f.expense === 0);

    const opening =
      openingFromBegins > 0
        ? Math.round(openingFromBegins * 100) / 100
        : totalsRow?.overall || 0;
    const income = totalsRow?.income ?? 0;
    const expense = totalsRow?.expense ?? 0;
    const closing =
      closingRow?.overall ??
      Math.round((opening + income - expense) * 100) / 100;

    if (opening || income || expense) {
      out[ym] = { opening, income, expense, closing, accounts };
    }
  }

  return out;
}

async function main() {
  let buf: Buffer;
  try {
    buf = await downloadWorkbook();
  } catch (e) {
    if (existsSync(XLSX_PATH)) {
      console.warn(`Download failed (${e}); using local ${XLSX_PATH}`);
      buf = readFileSync(XLSX_PATH);
    } else {
      throw e;
    }
  }

  const summaries = extractMonthSummaries(buf);
  const summaryPath = join(process.cwd(), "src", "data", "month-summaries.json");
  mkdirSync(join(process.cwd(), "src", "data"), { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(summaries, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(summaries).length} month summaries → ${summaryPath}`);
  if (summaries["2026-11"]) {
    console.log("  Nov 2026 Excel:", summaries["2026-11"]);
  }

  const raw = parseWorkbook(buf);
  const parsed = parseRows(raw);
  console.log(
    `→ ${parsed.accounts.length} accounts, ${parsed.transactions.length} transactions, ` +
      `${parsed.skipped.length} parser-skipped`,
  );
  for (const a of parsed.accounts) {
    console.log(`  account ${a.name} opening ${a.opening_balance} on ${a.opening_date}`);
  }

  const supabase = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });

  await supabase.from("transactions").delete().eq("user_id", userId!);
  await supabase.from("accounts").delete().eq("user_id", userId!);

  const keyToId = new Map<string, string>();
  for (const [i, a] of parsed.accounts.entries()) {
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
  }

  const rows = parsed.transactions.map((t) => ({
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

  // ---------- Gift lists (Biyer / Babur) ----------
  const gifts = extractGiftSheets(buf);
  const { error: giftDelErr } = await supabase
    .from("gift_entries")
    .delete()
    .eq("user_id", userId!);
  if (giftDelErr) {
    console.warn(
      `\n⚠ gift_entries table missing or blocked (${giftDelErr.message}).\n` +
        `  Run supabase/gifts.sql in the Supabase SQL editor, then re-run npm run seed:google.\n`,
    );
  } else if (gifts.length) {
    const { error: giftInsErr } = await supabase.from("gift_entries").insert(
      gifts.map((g) => ({ ...g, user_id: userId! })),
    );
    if (giftInsErr) die(`Gift insert failed: ${giftInsErr.message}`);
    console.log(
      `  gifts: ${gifts.filter((g) => g.list === "biyer").length} Biyer, ` +
        `${gifts.filter((g) => g.list === "babur").length} Babur`,
    );
  }

  console.log("\n✓ Google Sheet import complete.\n");
}

type GiftRow = {
  list: "biyer" | "babur";
  name: string;
  amount: number | null;
  item: string | null;
  kind: "gift" | "meta";
  sort_order: number;
};

function extractGiftSheets(buf: Buffer): GiftRow[] {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const out: GiftRow[] = [];
  const sheets: { name: string; list: "biyer" | "babur" }[] = [
    { name: "Biyer Gift", list: "biyer" },
    { name: "Babur Gift", list: "babur" },
  ];

  for (const { name, list } of sheets) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    let order = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const nameCell = String(r[0] ?? "").trim();
      const col1 = String(r[1] ?? "").trim();
      const col2 = String(r[2] ?? "").trim();
      if (!nameCell || /^name$/i.test(nameCell)) continue;

      const a1 = parseMoney(col1);
      const a2 = parseMoney(col2);
      let amount: number | null = null;
      let item: string | null = null;
      if (Number.isFinite(a1) && a1 > 0) {
        amount = a1;
        if (col2 && !Number.isFinite(a2)) item = col2;
      } else if (Number.isFinite(a2) && a2 > 0) {
        amount = a2;
      } else if (col2) {
        item = col2;
      } else if (col1 && !Number.isFinite(a1)) {
        item = col1;
      }

      const kind: "gift" | "meta" = /total|grand|venue/i.test(nameCell)
        ? "meta"
        : "gift";

      out.push({
        list,
        name: nameCell,
        amount,
        item,
        kind,
        sort_order: order++,
      });
    }
  }
  return out;
}

main().catch((e) => die(String(e)));
