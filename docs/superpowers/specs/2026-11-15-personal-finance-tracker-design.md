# Personal Finance Tracker — Design

Date: 2026-11-15
Owner: Anik (single private user)

## Intent & why
A private, **going-forward** personal finance tracker to log income and expenses
across the owner's accounts (Standard Chartered Bank, bKash, Nagad, Cash in hand),
replacing manual spreadsheet entry. Mobile-first, because daily logging happens on
the phone; also fully usable on desktop. Shipped as a responsive web app and an
**installable PWA**, deployed to **Vercel**, with data synced across devices via
**Supabase**. Seeded best-effort with the owner's 2020–2026 history.

## Goals
- Fast daily transaction entry on mobile (few taps).
- Current balance per account and overall, at a glance.
- Monthly summaries (income, expense, net) mirroring the spreadsheet's monthly totals.
- Charts: overall balance over time, income vs expense per month, spending by category.
- Private: only the owner can sign in; public sign-ups disabled.
- Full 2020–2026 history imported (best-effort) for whole-period views.
- Installable on iPhone/Android home screen; works in desktop browsers.

## Non-goals
- Native iOS/Android apps (App Store / Play Store). The PWA covers mobile.
- Multi-user, shared accounts, or sharing data with others.
- Bank / mobile-wallet API integrations or automatic transaction sync.
- Budgets, bill reminders, recurring-transaction automation (possible later).
- Multi-currency or currency conversion — single currency, **BDT (৳)**.

## Anti-goals (would be a failure even if it "works")
- Exposing the owner's financial data publicly.
- Losing data or silently corrupting balances.
- Entry slower or clunkier than the spreadsheet it replaces.

## Constraints
- Deploy target: **Vercel** (web).
- Storage + auth: **Supabase** (Postgres + Auth + Row Level Security).
- **New git repository**, **new folder** `C:\xampp\htdocs\expense-tracker`, separate
  from the existing projects in this workspace.
- Currency: **BDT (৳)**.
- Single private user; public signup disabled.

## Approaches considered
- **On-device only (IndexedDB PWA):** simplest, free, most private, but no
  phone↔laptop sync and data is lost if the browser is cleared. Rejected — daily
  cross-device use needs sync.
- **Next.js PWA + self-managed Postgres (Neon) + hand-rolled auth:** full control,
  but more auth/security code to write and maintain. Rejected in favor of Supabase.
- **Chosen — Next.js (App Router) PWA + Supabase (Postgres + Auth + RLS) + Recharts,
  on Vercel.** Picked by the owner. Least custom auth code, managed database, native
  Vercel deploy, RLS keeps the data private per user.

## Tech stack (builder's calls, stated)
- Next.js 14+ App Router, TypeScript, Tailwind CSS.
- Supabase: Postgres; Auth via email + password; Row Level Security scoped to the
  owner's `user_id`.
- Recharts for charts.
- PWA via web app manifest + service worker (next-pwa / Serwist), app icon.
- Deployment: Vercel project linked to the new GitHub repo; Supabase project; keys in
  environment variables (Supabase URL + anon key client-side; service role key only in
  server-side import).

## Data model
- **accounts**: `id` (uuid), `user_id`, `name`, `type` (bank | mobile | cash),
  `currency` (default BDT), `opening_balance` (numeric), `opening_date` (date),
  `sort_order`, `archived` (bool).
- **transactions**: `id`, `user_id`, `account_id`, `date`, `type` (income | expense),
  `amount` (numeric), `description`, `category`, `note`, `created_at`, `updated_at`.
- Balances are **computed**, not stored: account balance = `opening_balance` +
  Σ income − Σ expense; overall balance = Σ account balances.
- Transfers: v1 treats them as a plain expense in one account + income in another (the
  spreadsheet does the same). First-class linked transfers are a later option.
- Categories: free text with suggestions derived from history (Salary, Bonus, Cash out,
  Medicine, Food, Family, Transfer, Shopping, Transport, Bills, …). Starter list seeded,
  editable.

## Features / screens
1. **Login** — Supabase auth; single account; sign-ups off.
2. **Dashboard (home)** — total balance, per-account balance cards, this month's
   income / expense / net, recent transactions, prominent "Add" button.
3. **Add / edit transaction** — date, account, income/expense toggle, amount,
   description, category; optimized for one-thumb entry.
4. **Transactions** — list with month / account / category filters and search;
   edit and delete.
5. **Monthly summary** — per-month income, expense, net (mirrors the sheet's monthly
   totals), with month navigation.
6. **Insights / charts** — overall balance over time, income vs expense per month,
   spending by category.
7. **Accounts** — list with balances; add / edit / archive; set opening balance.
8. **PWA shell** — installable, app icon, offline read of cached data.

## History import (best-effort, one-time)
- Parse the provided spreadsheet (PDF) into transactions via a seed script.
- **Opening balances** come from the first month's Beginning Balance rows
  (June 2020: SCB 63,960.36, bKash 9,660; Nagad/Cash added when they first appear).
- Every row carrying an **Income Money IN** or **Expense Money OUT** value becomes one
  transaction (date, account, amount, description → category guess).
- **"Beginning Balance" snapshot rows are NOT imported as transactions** — they are
  running carryovers; importing them would double-count.
- Account is inferred from the account/category column (SCB, Bkash, Nagad, Cash in hand).
- Blank, duplicate, and trailing rows are skipped; inconsistent dates normalized
  best-effort.
- Clearly approximate: the app recomputes running balances from opening balance +
  transactions, so figures may differ slightly from the hand-kept spreadsheet totals.

## Repo & deploy
- New folder `C:\xampp\htdocs\expense-tracker`; new git repo.
- New **GitHub repo** (name + private visibility to confirm) and **Vercel** project;
  **Supabase** project created; env vars set.
- Outward actions — creating/pushing the GitHub repo, creating the Vercel project and
  Supabase project, and deploying — are **confirmed with the owner before running**,
  since they require the owner's accounts.

## Left to the builder
- Exact category taxonomy and auto-categorization rules for the import.
- PWA offline depth — v1: cached read, online-only writes (no offline write queue).
- Visual theme (light + dark) and component details.
- Whether transfers get first-class support in v1 or stay plain in/out (default: plain).
