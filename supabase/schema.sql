-- Ledger — personal finance tracker schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------- Accounts ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'mobile', 'cash')),
  currency text not null default 'BDT',
  opening_balance numeric(14, 2) not null default 0,
  opening_date date not null default current_date,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts (user_id, sort_order);

-- ---------- Transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  description text not null default '',
  category text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index if not exists transactions_user_account_idx
  on public.transactions (user_id, account_id);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Gift lists (Biyer Gift / Babur Gift from the spreadsheet) ----------
create table if not exists public.gift_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list text not null check (list in ('biyer', 'babur')),
  name text not null,
  amount numeric(14, 2),
  item text,
  kind text not null default 'gift' check (kind in ('gift', 'meta')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gift_entries_user_list_idx
  on public.gift_entries (user_id, list, sort_order);

alter table public.gift_entries enable row level security;

drop policy if exists "gift_entries_owner" on public.gift_entries;
create policy "gift_entries_owner" on public.gift_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
