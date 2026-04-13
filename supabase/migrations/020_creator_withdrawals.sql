-- Migration 020: Creator Withdrawals
-- Tracks payout requests submitted by creators.

create table if not exists creator_withdrawals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric(14,4) not null,
  method       text not null default 'PayPal'
               check (method in ('PayPal', 'Bank Transfer', 'Mobile Money', 'Stripe', 'Payoneer')),
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'processing', 'paid', 'rejected')),
  phone        text,
  description  text,
  admin_note   text,
  approved_at  timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_creator_withdrawals_user   on creator_withdrawals(user_id);
create index if not exists idx_creator_withdrawals_status on creator_withdrawals(status);

alter table creator_withdrawals enable row level security;

-- Creators can see their own withdrawal requests
create policy "withdrawals_owner_read" on creator_withdrawals
  for select using (user_id = auth.uid());

-- Creators can insert their own requests
create policy "withdrawals_owner_insert" on creator_withdrawals
  for insert with check (user_id = auth.uid());

-- Admins can manage all withdrawals
create policy "withdrawals_admin_all" on creator_withdrawals
  for all using (
    exists (select 1 from admin_roles where admin_roles.user_id = auth.uid())
  );
