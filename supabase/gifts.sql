-- Run this in Supabase SQL Editor if gift_entries is not created yet.

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
