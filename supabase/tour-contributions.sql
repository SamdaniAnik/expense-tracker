-- Tour money contributions (group pot) — run in Supabase SQL editor

create table if not exists public.tour_contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups (id) on delete cascade,
  member_id uuid not null references public.tour_members (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'BDT',
  note text,
  date date not null default current_date,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists tour_contributions_group_idx
  on public.tour_contributions (group_id, date desc);

alter table public.tour_contributions enable row level security;

drop policy if exists "tour_contributions_all" on public.tour_contributions;
create policy "tour_contributions_all" on public.tour_contributions
  for all using (public.is_tour_member(group_id))
  with check (public.is_tour_member(group_id));
