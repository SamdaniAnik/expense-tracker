# Paisa — Personal Finance Tracker

A private, mobile-first income & expense tracker (installable PWA) for a single
user. Built with Next.js + Supabase, deploys to Vercel. Seeded best-effort with
2020–2026 history from the owner's spreadsheet.

- **Accounts:** Standard Chartered Bank, bKash, Nagad, Cash in hand (BDT ৳).
- **Features:** dashboard with balances, fast add-transaction, filterable
  activity list, monthly summaries, charts, accounts management, offline shell.
- **Private:** email + password login, public sign-ups disabled, Row Level
  Security so only the owner sees the data.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. **Authentication → Providers → Email**: enable it, and turn **off**
   "Allow new users to sign up" (single-user app). Turn **off** "Confirm email"
   so your one account can sign in immediately.
4. **Authentication → Users → Add user**: create your account (email + password).
   Copy its **User UID** — you'll need it for the import.
5. **Project Settings → API**: copy the **Project URL** and the **anon/public**
   key, and (for the import only) the **service_role** key.

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # import only
SEED_USER_ID=your-auth-user-uuid                   # from step 1.4
```

## 3. Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (money, balances, import parser)
```

Sign in with the account you created in step 1.4.

## 4. Import your history (optional, one-time)

Seeds accounts + the transcribed 2020–2026 history. Safe to re-run (it wipes
and reloads the seed user's rows).

```bash
npm run seed
```

The transcription in [`scripts/import/data.ts`](scripts/import/data.ts) is a
best-effort subset of the ledger (openings, every salary/bonus, and the major
money movements). To keep running balances honest,
[`scripts/import/reconcile.ts`](scripts/import/reconcile.ts) adds one labelled
"Balance adjustment (history)" row at each year-end so the totals match the
spreadsheet's reported balances. Add more rows to `data.ts` and re-run any time;
edit or delete individual imported rows right in the app.

## 5. Deploy to Vercel

1. Push this folder to a new **private** GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework
   auto-detected as Next.js).
3. **Environment Variables**: add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the service role key is **not** needed in
   Vercel — the import runs locally).
4. Deploy. Open the URL, sign in, and on your phone use **Share → Add to Home
   Screen** (iOS) or the install prompt (Android) to install the app.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Postgres +
Auth + RLS) · Recharts · Vitest. Design & plan live in
[`docs/superpowers/`](docs/superpowers/).
