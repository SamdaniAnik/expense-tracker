-- Emergency repair: restore simple owner RLS if pages fail after features.sql
-- Safe to run anytime. Does NOT remove household sharing columns.

drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner" on public.accounts
  for all using (
    auth.uid() = user_id
    or (
      coalesce(household_id, '00000000-0000-0000-0000-000000000000'::uuid)
        is distinct from '00000000-0000-0000-0000-000000000000'::uuid
      and exists (
        select 1 from public.household_members m
        where m.household_id = accounts.household_id and m.user_id = auth.uid()
      )
    )
  ) with check (auth.uid() = user_id);

-- If household_id column is missing, the above fails — use this simpler fallback instead:
-- drop policy if exists "accounts_owner" on public.accounts;
-- create policy "accounts_owner" on public.accounts
--   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  for all using (
    auth.uid() = user_id
    or (
      household_id is not null
      and exists (
        select 1 from public.household_members m
        where m.household_id = transactions.household_id and m.user_id = auth.uid()
      )
    )
  ) with check (auth.uid() = user_id);
