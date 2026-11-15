-- Paisa public-app pack: profiles, tours (Splitwise-style), FX cache
-- Run in Supabase SQL editor after schema.sql / fix-rls.sql

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  display_currency text not null default 'BDT',
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

-- Own-row access only. Admins use the service-role client for user management.
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users
insert into public.profiles (id, email, display_name)
select id, coalesce(email, ''), coalesce(split_part(email, '@', 1), 'user')
from auth.users
on conflict (id) do nothing;

-- ---------- FX rates cache ----------
create table if not exists public.fx_rates (
  base text not null default 'EUR',
  rates jsonb not null default '{}',
  fetched_at timestamptz not null default now(),
  primary key (base)
);

alter table public.fx_rates enable row level security;
drop policy if exists "fx_rates_read" on public.fx_rates;
create policy "fx_rates_read" on public.fx_rates for select using (auth.uid() is not null);

-- ---------- Tour groups (Splitwise-style) ----------
create table if not exists public.tour_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  base_currency text not null default 'BDT',
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  guest_name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  constraint tour_members_identity check (user_id is not null or guest_name is not null)
);

create unique index if not exists tour_members_user_unique
  on public.tour_members (group_id, user_id) where user_id is not null;

create table if not exists public.tour_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups (id) on delete cascade,
  paid_by uuid not null references public.tour_members (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'BDT',
  description text not null default '',
  date date not null default current_date,
  split_type text not null default 'equal' check (split_type in ('equal', 'exact')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.tour_expenses (id) on delete cascade,
  member_id uuid not null references public.tour_members (id) on delete cascade,
  owed_amount numeric(14, 2) not null check (owed_amount >= 0),
  unique (expense_id, member_id)
);

create table if not exists public.tour_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups (id) on delete cascade,
  from_member uuid not null references public.tour_members (id) on delete cascade,
  to_member uuid not null references public.tour_members (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'BDT',
  note text,
  date date not null default current_date,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists tour_members_group_idx on public.tour_members (group_id);
create index if not exists tour_expenses_group_idx on public.tour_expenses (group_id, date desc);
create index if not exists tour_settlements_group_idx on public.tour_settlements (group_id);

alter table public.tour_groups enable row level security;
alter table public.tour_members enable row level security;
alter table public.tour_expenses enable row level security;
alter table public.tour_shares enable row level security;
alter table public.tour_settlements enable row level security;

create or replace function public.is_tour_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tour_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

drop policy if exists "tour_groups_member" on public.tour_groups;
create policy "tour_groups_member" on public.tour_groups
  for select using (public.is_tour_member(id) or created_by = auth.uid());

drop policy if exists "tour_groups_insert" on public.tour_groups;
create policy "tour_groups_insert" on public.tour_groups
  for insert with check (auth.uid() = created_by);

drop policy if exists "tour_groups_update" on public.tour_groups;
create policy "tour_groups_update" on public.tour_groups
  for update using (public.is_tour_member(id));

drop policy if exists "tour_groups_delete" on public.tour_groups;
create policy "tour_groups_delete" on public.tour_groups
  for delete using (created_by = auth.uid());

drop policy if exists "tour_members_select" on public.tour_members;
create policy "tour_members_select" on public.tour_members
  for select using (public.is_tour_member(group_id));

drop policy if exists "tour_members_insert" on public.tour_members;
create policy "tour_members_insert" on public.tour_members
  for insert with check (
    public.is_tour_member(group_id)
    or user_id = auth.uid()
  );

drop policy if exists "tour_members_delete" on public.tour_members;
create policy "tour_members_delete" on public.tour_members
  for delete using (public.is_tour_member(group_id));

drop policy if exists "tour_expenses_all" on public.tour_expenses;
create policy "tour_expenses_all" on public.tour_expenses
  for all using (public.is_tour_member(group_id))
  with check (public.is_tour_member(group_id));

drop policy if exists "tour_shares_all" on public.tour_shares;
create policy "tour_shares_all" on public.tour_shares
  for all using (
    exists (
      select 1 from public.tour_expenses e
      where e.id = expense_id and public.is_tour_member(e.group_id)
    )
  ) with check (
    exists (
      select 1 from public.tour_expenses e
      where e.id = expense_id and public.is_tour_member(e.group_id)
    )
  );

drop policy if exists "tour_settlements_all" on public.tour_settlements;
create policy "tour_settlements_all" on public.tour_settlements
  for all using (public.is_tour_member(group_id))
  with check (public.is_tour_member(group_id));
