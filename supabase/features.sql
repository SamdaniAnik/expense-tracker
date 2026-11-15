-- Paisa feature pack — run once in Supabase SQL editor after schema.sql
-- Covers: budgets, recurring, transfers, receipts, debts, tags, household

-- ---------- Extend transactions ----------
alter table public.transactions
  add column if not exists tags text[] not null default '{}',
  add column if not exists receipt_path text,
  add column if not exists transfer_group_id uuid,
  add column if not exists household_id uuid,
  add column if not exists is_transfer boolean not null default false;

create index if not exists transactions_tags_gin
  on public.transactions using gin (tags);
create index if not exists transactions_transfer_group_idx
  on public.transactions (transfer_group_id)
  where transfer_group_id is not null;

-- ---------- Budgets (monthly category caps) ----------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  household_id uuid,
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  month text not null default '', -- '' = every month; YYYY-MM for one month only
  created_at timestamptz not null default now(),
  unique (user_id, category, month)
);

create index if not exists budgets_user_idx on public.budgets (user_id);

alter table public.budgets enable row level security;
drop policy if exists "budgets_owner" on public.budgets;
create policy "budgets_owner" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Recurring rules ----------
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  description text not null default '',
  category text,
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  last_applied date,
  created_at timestamptz not null default now()
);

create index if not exists recurring_user_idx on public.recurring_rules (user_id, active);

alter table public.recurring_rules enable row level security;
drop policy if exists "recurring_owner" on public.recurring_rules;
create policy "recurring_owner" on public.recurring_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Debts / loans ----------
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('owe', 'lent')), -- owe = I owe them; lent = they owe me
  name text not null,
  counterparty text not null default '',
  principal numeric(14, 2) not null check (principal >= 0),
  remaining numeric(14, 2) not null check (remaining >= 0),
  due_date date,
  note text,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists debts_user_idx on public.debts (user_id, settled);

alter table public.debts enable row level security;
drop policy if exists "debts_owner" on public.debts;
create policy "debts_owner" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists debts_touch on public.debts;
create trigger debts_touch
  before update on public.debts
  for each row execute function public.touch_updated_at();

-- ---------- Household sharing ----------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx
  on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

drop policy if exists "households_member" on public.households;
create policy "households_member" on public.households
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.household_members m
      where m.household_id = id and m.user_id = auth.uid()
    )
  );

drop policy if exists "households_owner_write" on public.households;
create policy "households_owner_write" on public.households
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "household_members_read" on public.household_members;
create policy "household_members_read" on public.household_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.household_members m
      where m.household_id = household_members.household_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "household_members_owner_write" on public.household_members;
create policy "household_members_owner_write" on public.household_members
  for all using (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
    or user_id = auth.uid()
  ) with check (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

alter table public.accounts
  add column if not exists household_id uuid references public.households (id) on delete set null;

-- Shared read/write for household members on accounts & transactions
-- Keep owner RLS simple and reliable. Household sharing is enforced in app
-- actions by tagging rows with household_id; members can be granted access later
-- via a dedicated policy once the feature is confirmed stable.
drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Receipts storage bucket ----------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_owner_read" on storage.objects;
create policy "receipts_owner_read" on storage.objects
  for select using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "receipts_owner_write" on storage.objects;
create policy "receipts_owner_write" on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "receipts_owner_update" on storage.objects;
create policy "receipts_owner_update" on storage.objects
  for update using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "receipts_owner_delete" on storage.objects;
create policy "receipts_owner_delete" on storage.objects
  for delete using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
