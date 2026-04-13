-- Migration 023: Distribution platform delivery statuses
-- Per-release, per-platform delivery tracking for the Releases dashboard.

create table if not exists distribution_platform_statuses (
  id            uuid primary key default gen_random_uuid(),
  release_id    uuid not null references distribution_releases(id) on delete cascade,
  platform_id   text not null,                                     -- 'spotify', 'apple_music', etc.
  platform_name text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'live', 'rejected')),
  live_url      text,
  go_live_date  date,
  updated_at    timestamptz not null default now(),
  unique (release_id, platform_id)
);

create index if not exists idx_dps_release_id on distribution_platform_statuses(release_id);

alter table distribution_platform_statuses enable row level security;

-- Artists can read their own release statuses
create policy "dps_owner_read" on distribution_platform_statuses
  for select using (
    exists (
      select 1 from distribution_releases dr
      where dr.id = release_id
        and (dr.user_id = auth.uid() or dr.artist_id = auth.uid())
    )
  );

-- Service role / admins can manage all rows
create policy "dps_admin_all" on distribution_platform_statuses
  for all using (
    exists (select 1 from admin_roles where user_id = auth.uid())
  );
