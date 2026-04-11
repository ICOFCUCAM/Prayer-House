-- ============================================================
-- WANKONG — Admin Invites
-- ============================================================

create table if not exists admin_invites (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  role       text not null check (role in (
               'moderator','competition_admin','distribution_admin',
               'publishing_admin','finance_admin','support_admin')),
  token      text unique not null default gen_random_uuid()::text,
  accepted   boolean not null default false,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_invites_token on admin_invites(token);
create index if not exists idx_admin_invites_email on admin_invites(email);

-- RLS: only admins can see invites
alter table admin_invites enable row level security;

create policy "Super admins can manage invites"
  on admin_invites for all
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = auth.uid()
        and admin_roles.role = 'super_admin'
    )
  );

-- Anyone with the token can read the invite row (needed for accept page)
create policy "Invite holder can read by token"
  on admin_invites for select
  using (true);
