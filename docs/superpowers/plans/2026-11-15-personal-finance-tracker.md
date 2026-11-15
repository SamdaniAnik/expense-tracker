# Personal Finance Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private, mobile-first PWA to log income/expenses across the owner's accounts, synced via Supabase, deployed to Vercel, seeded with 2020–2026 history.

**Architecture:** Next.js (App Router) front end rendered server- and client-side; Supabase Postgres holds `accounts` and `transactions` behind Row Level Security scoped to the signed-in user; balances are computed from opening balance + transactions, never stored. A one-time Node seed script imports the spreadsheet history with the service-role key. Deployed on Vercel; installable as a PWA.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, Supabase JS (`@supabase/supabase-js`, `@supabase/ssr`), Recharts, Serwist (PWA), Vercel.

**Spec:** `docs/superpowers/specs/2026-11-15-personal-finance-tracker-design.md`

## Global Constraints

- Currency: **BDT (৳)** everywhere money is shown; store amounts as `numeric`.
- Single private user; Supabase **email auth with sign-ups disabled** in the dashboard; app shows no public registration.
- Every `accounts`/`transactions` row carries `user_id = auth.uid()`; **RLS** enforces owner-only access.
- Amounts are positive numbers; direction is the `type` column (`income` | `expense`).
- New folder `C:\xampp\htdocs\expense-tracker`, new git repo, isolated from the workspace's other projects.
- Secrets: anon/public key and project URL are client-safe env vars; **service-role key only in the seed script**, never shipped to the client or committed.

## Review Focus

- **Empty state (no transactions / no accounts):** dashboard, lists, and charts must render a friendly empty state, not crash on `undefined`/NaN. Owned by Task 5/7/9.
- **Negative or zero running balance:** balance math must show negatives correctly (overspend), not clamp or error. Owned by Task 4.
- **Fractional/large amounts (e.g. 63,960.36, 166,500):** numeric parsing and formatting must keep two decimals and group thousands, no float drift in sums. Owned by Task 4.
- **Unauthenticated access to a data route:** hitting `/dashboard` or an API with no session must redirect to login, never leak another session's data. Owned by Task 2.
- **Malformed import rows (blank amount, bad date, unknown account):** the seed script must skip and log them, not abort the whole import. Owned by Task 12.

---

### Task 0: Scaffold app + repo

**Files:**
- Create: project via `create-next-app` in `C:\xampp\htdocs\expense-tracker` (TypeScript, Tailwind, App Router, ESLint, src dir, import alias `@/*`).
- Create: `.gitignore` (ensure `.env*.local`), `.env.example`, `README.md`.
- Modify: `package.json` to add deps `@supabase/supabase-js @supabase/ssr recharts` and dev dep `@serwist/next serwist vitest @vitejs/plugin-react`.

- [ ] Step 1: Run `npx create-next-app@latest` with the flags above in the expense-tracker folder.
- [ ] Step 2: Install the dependencies above.
- [ ] Step 3: `git init`, add a Next.js `.gitignore`, first commit `chore: scaffold next.js app`.
- [ ] Step 4: Verify `npm run dev` boots and `npm run build` succeeds.

### Task 1: Database schema + RLS

**Files:**
- Create: `supabase/schema.sql` (tables, indexes, RLS policies).
- Create: `src/lib/types.ts` (TypeScript `Account`, `Transaction`, `AccountType`, `TxType`).

**Interfaces:**
- Produces: `Account { id, user_id, name, type, currency, opening_balance, opening_date, sort_order, archived }`, `Transaction { id, user_id, account_id, date, type, amount, description, category, note, created_at, updated_at }`. `AccountType = 'bank'|'mobile'|'cash'`, `TxType = 'income'|'expense'`.

- [ ] Step 1: Write `schema.sql`: `accounts` and `transactions` tables as above; FK `transactions.account_id → accounts.id`; indexes on `(user_id, date)` and `(user_id, account_id)`; enable RLS; policies `using (auth.uid() = user_id)` for select/insert/update/delete on both tables.
- [ ] Step 2: Write `src/lib/types.ts` matching the columns exactly.
- [ ] Step 3: Commit `feat: db schema and types`.

### Task 2: Supabase clients + auth gating

**Files:**
- Create: `src/lib/supabase/client.ts` (browser client), `src/lib/supabase/server.ts` (server client via `@supabase/ssr` cookies), `src/middleware.ts` (refresh session + protect routes).

**Interfaces:**
- Produces: `createClient()` (browser), `createServerClient()` (server). Middleware redirects unauthenticated requests for `/`, `/transactions`, `/accounts`, `/insights`, `/months` to `/login`.

- [ ] Step 1: Implement browser + server clients from env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- [ ] Step 2: Implement middleware that refreshes the session and redirects unauthenticated users of protected paths to `/login`; redirects signed-in users away from `/login`.
- [ ] Step 3: Commit `feat: supabase clients and auth middleware`.

### Task 3: Login page

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/login/actions.ts` (server action `signIn`), `src/app/auth/signout/route.ts`.

- [ ] Step 1: Build a minimal email+password sign-in form posting to the `signIn` server action; show auth errors; on success redirect to `/`.
- [ ] Step 2: Add a sign-out route that clears the session and redirects to `/login`.
- [ ] Step 3: Commit `feat: login and signout`.

### Task 4: Balance + money core (TDD)

**Files:**
- Create: `src/lib/money.ts` (`formatBDT`, `parseAmount`), `src/lib/balances.ts` (`accountBalance`, `overallBalance`, `monthTotals`).
- Test: `src/lib/balances.test.ts`, `src/lib/money.test.ts`.

**Interfaces:**
- Produces: `accountBalance(account, txns): number`, `overallBalance(accounts, txns): number`, `monthTotals(txns, year, month): { income, expense, net }`, `formatBDT(n): string`, `parseAmount(s): number`.

- [ ] Step 1: Write failing tests: `accountBalance` adds income and subtracts expense onto `opening_balance` incl. a negative result; `overallBalance` sums accounts; `monthTotals` filters by year/month and returns income/expense/net; `formatBDT(63960.36)` → `"৳63,960.36"`; `parseAmount("63,960.36")` → `63960.36`; sum of fractional amounts has no float drift (assert `toBeCloseTo`/rounded).
- [ ] Step 2: Run tests, verify they fail.
- [ ] Step 3: Implement `money.ts` and `balances.ts` (round currency math to 2 decimals via integer cents internally).
- [ ] Step 4: Run tests, verify pass.
- [ ] Step 5: Commit `feat: money and balance calculations`.

### Task 5: Data access + Dashboard

**Files:**
- Create: `src/lib/data.ts` (`getAccounts`, `getTransactions`, `getRecentTransactions`), `src/app/(app)/layout.tsx` (nav shell), `src/app/(app)/page.tsx` (dashboard), `src/components/*` (AccountCard, StatTile, TxRow, BottomNav).

**Interfaces:**
- Consumes: Task 4 balance helpers; Task 2 server client.
- Produces: `getAccounts(): Promise<Account[]>`, `getTransactions(filter?): Promise<Transaction[]>`.

- [ ] Step 1: Implement `data.ts` queries (owner-scoped via RLS; order by date desc).
- [ ] Step 2: Build the app shell: top bar with total balance, bottom nav (Home, Add, Transactions, Insights), mobile-first.
- [ ] Step 3: Build dashboard: overall balance, per-account cards, this-month income/expense/net tiles, recent transactions, empty states when no data.
- [ ] Step 4: Commit `feat: data layer and dashboard`.

### Task 6: Add / edit transaction

**Files:**
- Create: `src/app/(app)/add/page.tsx`, `src/app/(app)/transactions/[id]/edit/page.tsx`, `src/app/(app)/transactions/actions.ts` (`createTx`, `updateTx`, `deleteTx` server actions), `src/components/TxForm.tsx`.

**Interfaces:**
- Consumes: `getAccounts`, category suggestions.
- Produces: server actions that insert/update/delete a transaction with `user_id = auth.uid()`.

- [ ] Step 1: Build `TxForm`: income/expense toggle, amount (numeric keypad), account select, date (default today), description, category (datalist of suggestions).
- [ ] Step 2: Implement `createTx`/`updateTx`/`deleteTx` server actions with validation (amount > 0, account owned).
- [ ] Step 3: Wire add + edit pages; on success redirect to dashboard/transactions; revalidate.
- [ ] Step 4: Commit `feat: add/edit/delete transactions`.

### Task 7: Transactions list

**Files:**
- Create: `src/app/(app)/transactions/page.tsx`, `src/components/TxFilters.tsx`.

- [ ] Step 1: List transactions grouped by date, newest first, with per-row account + category + signed amount.
- [ ] Step 2: Filters: month, account, category, text search (query params); empty state.
- [ ] Step 3: Row links to edit. Commit `feat: transactions list with filters`.

### Task 8: Monthly summary

**Files:**
- Create: `src/app/(app)/months/page.tsx`.

- [ ] Step 1: Month navigator; show income, expense, net for the month and per-account breakdown (mirrors the sheet's monthly totals).
- [ ] Step 2: Commit `feat: monthly summary`.

### Task 9: Insights / charts

**Files:**
- Create: `src/app/(app)/insights/page.tsx`, `src/components/charts/*`.

- [ ] Step 1: Overall balance over time (line), income vs expense per month (bars), spending by category (top N). Recharts, responsive, empty states.
- [ ] Step 2: Commit `feat: insights charts`.

### Task 10: Accounts management

**Files:**
- Create: `src/app/(app)/accounts/page.tsx`, `src/app/(app)/accounts/actions.ts`.

- [ ] Step 1: List accounts with computed balances; add/edit/archive; set name, type, opening balance + date.
- [ ] Step 2: Commit `feat: accounts management`.

### Task 11: PWA

**Files:**
- Create: `src/app/manifest.ts`, `public/icons/*` (192/512, maskable), `src/app/sw.ts` (Serwist), modify `next.config` for Serwist.

- [ ] Step 1: Add manifest (name, theme color, icons, standalone), register Serwist service worker (precache shell, runtime-cache data GETs).
- [ ] Step 2: Verify installable + Lighthouse PWA pass locally. Commit `feat: installable PWA`.

### Task 12: History import (TDD parser)

**Files:**
- Create: `scripts/import/parse.ts` (rows → transactions), `scripts/import/data.ts` (transcribed spreadsheet rows), `scripts/import/seed.ts` (upsert accounts + insert transactions via service-role key).
- Test: `scripts/import/parse.test.ts`.

**Interfaces:**
- Produces: `parseRows(raw): { accounts, transactions, skipped }`. Skips rows without a numeric amount, with unparseable dates, or unknown accounts; never throws on a bad row.

- [ ] Step 1: Write failing tests: a valid income row and expense row map correctly; a `Beginning Balance` row is excluded from transactions; a blank-amount row goes to `skipped`; a `d/m/yyyy` and `m/d/yyyy` date both normalize; an unknown account goes to `skipped`.
- [ ] Step 2: Run tests, verify fail.
- [ ] Step 3: Implement `parseRows`: opening balances from the first Beginning Balance per account; map account column (SCB→bank, Bkash→mobile, Nagad→mobile, Cash in hand→cash); guess category from description keywords.
- [ ] Step 4: Transcribe the spreadsheet rows into `data.ts` (best-effort; machine-readable rows only).
- [ ] Step 5: Run tests, verify pass. Implement `seed.ts` (idempotent: wipe owner's rows then insert).
- [ ] Step 6: Commit `feat: history import parser and seed`.

### Task 13: Deploy

**Files:**
- Create: `vercel.json` (if needed), finalize `README.md` (setup: create Supabase project, run `schema.sql`, set env, disable signups, create owner user, run seed, connect Vercel).

- [ ] Step 1: Confirm owner's Supabase project exists; run `schema.sql`; set env vars locally and in Vercel; disable public signups; create the single owner user; run the seed.
- [ ] Step 2: Push repo to new private GitHub repo; import to Vercel; set env vars; deploy.
- [ ] Step 3: Smoke test the live URL (login, add a transaction, see it on the dashboard, install on phone). Commit `docs: setup and deploy guide`.
