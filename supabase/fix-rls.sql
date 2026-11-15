-- Emergency repair — run this in Supabase SQL editor if the app returns 500 when logged in.
-- Restores simple owner-only RLS (no household_id dependency).

drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: only if these tables exist
do $$ begin
  if to_regclass('public.budgets') is not null then
    execute 'alter table public.budgets enable row level security';
    execute 'drop policy if exists "budgets_owner" on public.budgets';
    execute 'create policy "budgets_owner" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
  if to_regclass('public.recurring_rules') is not null then
    execute 'alter table public.recurring_rules enable row level security';
    execute 'drop policy if exists "recurring_owner" on public.recurring_rules';
    execute 'create policy "recurring_owner" on public.recurring_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
  if to_regclass('public.debts') is not null then
    execute 'alter table public.debts enable row level security';
    execute 'drop policy if exists "debts_owner" on public.debts';
    execute 'create policy "debts_owner" on public.debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
  if to_regclass('public.gift_entries') is not null then
    execute 'alter table public.gift_entries enable row level security';
    execute 'drop policy if exists "gift_entries_owner" on public.gift_entries';
    execute 'create policy "gift_entries_owner" on public.gift_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;
